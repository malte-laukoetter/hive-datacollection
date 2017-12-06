import { Updater } from "./Updater";
import { Achievement, GameTypes, GameType, Player, PlayerGameInfo, PlayerInfo } from "hive-api";
import { UpdateService } from "./UpdateService";
import { database, firestore } from "firebase-admin";
import { CollectionReference, DocumentReference } from "@google-cloud/firestore";
import * as Utils from "../utils";

const ONE_DAY = 24*60*60*1000;

export class PlayerStatsUpdater extends Updater {
    private _ref: database.Reference;
    dataRef: CollectionReference;
    dailyRef: database.Reference;
    currentWeeklyRef: database.Reference;
    prevWeeklyRef: database.Reference;
    currentMonthlyRef: database.Reference;
    prevMonthlyRef: database.Reference;

    queue: Set<()=>void> = new Set();

    constructor(db: database.Database, fs: firestore.Firestore) {
        super();

        this._ref = db.ref("playerStats");
        this.dataRef = fs.collection("players");
        this.dailyRef = this._ref.child("daily");
        this.currentWeeklyRef = this._ref.child("weekly").child(new Date().getDay().toString());

        // weekly ref of next day (current day + 1 mod 7)
        this.prevWeeklyRef = this._ref.child("weekly").child((new Date().getDay() % 7).toString());

        // not monthly but all 30 days
        this.currentMonthlyRef = this._ref.child("monthly").child((PlayerStatsUpdater.dayOfYear(new Date()) % 30).toString());
        this.prevMonthlyRef = this._ref.child("monthly").child(((PlayerStatsUpdater.dayOfYear(new Date()) - 1) % 30).toString());

        UpdateService.registerAllPlayerGameInfosUpdater((gameInfos, player, playerInfo) => this.update(gameInfos, player, playerInfo), "Player Stats Updater");
    }

    async start(): Promise<any> {
        this.updateDataFromUpdateRef(14, this.dailyRef, this.prevWeeklyRef);

        this.updateDataFromUpdateRef(10, this.currentWeeklyRef, this.prevMonthlyRef);

        this.updateDataFromUpdateRef(12, this.currentMonthlyRef, null);

        setInterval(()=>{
            let f = this.queue.values().next().value;

            if(f){
                f();
                this.queue.delete(f);
            }
        }, 30*1000);

        return;
    }

    private static setStats(doc: DocumentReference, data){
        const tempObj = {};
        tempObj[Utils.currentISODateString()] = data;
        doc.set(tempObj, { merge: true });
    }

    private update(gameInfos: Map<GameType, PlayerGameInfo>, player: Player, playerInfo: PlayerInfo) {
        if (playerInfo.uuid !== "") {
            const playerRef = this.dataRef.doc(player.uuid);
            const statsCollection = playerRef.collection("stats")

            const gameInfosArr = [... gameInfos.values()]
            
            // save total achievements
            const totalAchievements = PlayerStatsUpdater.countUnlockedAchievements(playerInfo, gameInfosArr);
            PlayerStatsUpdater.setStats(statsCollection.doc("achievements_total"), totalAchievements);
            
            // save total points
            const totalPoints = PlayerStatsUpdater.countTotalPoints(gameInfosArr);
            PlayerStatsUpdater.setStats(statsCollection.doc("points_total"), totalPoints);

            // save points for each gametype
            gameInfosArr
                .filter(info => info.hasOwnProperty("points"))
                .forEach(info => {
                    PlayerStatsUpdater.setStats(statsCollection.doc(`points_${info.type.id}`), info.points);
                });

            // save achievement count for each gametype
            gameInfosArr
                .filter(info => info.hasOwnProperty("achievements"))
                .filter((info: any) => info.achievements)
                .forEach((info: any) => {
                    PlayerStatsUpdater.setStats(
                        statsCollection.doc(`achievements_${info.type.id}`),
                        (info.achievements as Achievement[]).filter(a => a.unlocked).length // amount of unlocked achievements
                    );
                });

            if (playerInfo.achievements) {
                // save global achievements
                PlayerStatsUpdater.setStats(
                    statsCollection.doc(`achievements_global`), 
                    playerInfo.achievements.filter(a => a.unlocked).length
                );
            }

            // save medals and tokens
            PlayerStatsUpdater.setStats(statsCollection.doc("medals"), playerInfo.medals);
            PlayerStatsUpdater.setStats(statsCollection.doc("points_total"), playerInfo.tokens);

            playerRef.set({
                total_points: totalPoints,
                points: gameInfosArr
                    .filter(info => info.hasOwnProperty("points"))
                    .reduce((obj, info) => {
                        obj[info.type.id] = info.points;
                        return obj;
                    }, {}),
                total_achivements: totalAchievements,
                achievements: gameInfosArr
                    .filter(info => info.hasOwnProperty("achievements"))
                    .reduce((obj, info: any) => {
                        obj[info.type.id] = (info.achievements as Achievement[]).filter(a => a.unlocked).length;
                        return obj;
                    }, { global: playerInfo.achievements.filter(a => a.unlocked).length})
            }, { merge: true });

            return true;
        }
    }

    async updatePlayerDate(player: Player): Promise<boolean> {
        await this.addToQueue();

        try {
            await UpdateService.requestAllPlayerGameInfosUpdate(player, ONE_DAY);

            return true;
        }catch(err) {
            if (err.name === "FetchError") {
                console.error(`Error Response from Hive: ${player.uuid}`)
            } else {
                console.error(`error while updating ${player.uuid}: ${err.message}`)
            }

            return false;
        }
    }

    static countUnlockedAchievements(playerInfo: PlayerInfo, gameInfos: PlayerGameInfo[]): number {
        // count the unlocked achievements of the games
        let totalAchievements = gameInfos
            .filter(info => info.hasOwnProperty("achievements"))
            .filter((info: any) => info.achievements)
            .map((info: any) => info.achievements)
            .map((arr: Achievement[]) => arr.filter(a => a.unlocked))
            .map(arr => arr.length)
            .reduceRight((a, b) => a + b, 0);

        // add the unlocked global achievements
        totalAchievements += playerInfo.achievements.filter(a => a.unlocked).length;

        return totalAchievements;
    }

    static countTotalPoints(gameInfos: PlayerGameInfo[]): number {
        return gameInfos
            .filter(info => info.hasOwnProperty("points"))
            .map(info => info.points)
            .reduceRight((a, b) => a + b, 0);
    }

    addToQueue(): Promise<void>{
        return new Promise((resolve)=>{
            this.queue.add(resolve);
        });
    }

    updateDataFromUpdateRef(amount, currentRef, nextRef){
        currentRef.orderByValue().on("child_added", async snap => {

            let success: boolean = await this.updatePlayerDate(new Player(snap.key));

            if(!success && snap.val() === 0){
				currentRef.child(snap.key).set(-1);
			}else if(!success && snap.val() === -1){
                currentRef.child(snap.key).remove();
            }else if(snap.val() >= amount){
                nextRef.child(snap.key).set(0);

                currentRef.child(snap.key).remove();
            }else{
                currentRef.child(snap.key).transaction((val) => {
                    return (val || 0) + 1;
                });
            }
        });
    }

    static dayOfYear(date: Date){
        return Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / ONE_DAY);
    }
}
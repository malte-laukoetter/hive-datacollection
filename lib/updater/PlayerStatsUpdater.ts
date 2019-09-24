import { Achievement, GameTypes, GameType, Player, PlayerGameInfo, PlayerInfo, HidePlayerGameInfo } from "hive-api";
import { UpdateService } from "./UpdateService";
import { database } from "firebase-admin";
import { Updater } from "lergins-bot-framework";

import { google } from 'googleapis';
import { bot } from '../main';
import { promisify } from 'util';
const OAuth2 = google.auth.OAuth2;
const sheets = google.sheets('v4');

export class PlayerStatsUpdater extends Updater {
    private _ref: database.Reference;
    dataRef: database.Reference;
    dailyRef: database.Reference;
    currentWeeklyRef: database.Reference;
    prevWeeklyRef: database.Reference;
    currentMonthlyRef: database.Reference;
    prevMonthlyRef: database.Reference;
    finishedRef: database.Reference;

    queue: Set<()=>void> = new Set();

    get id() { return `playerstats`; }

    constructor() {
        super();

        this._ref = database().ref("playerStats");
        this.dataRef = this._ref.child("data");
        this.dailyRef = this._ref.child("daily");
        this.currentWeeklyRef = this._ref.child("weekly").child(new Date().getDay().toString());

        // weekly ref of next day (current day + 1 mod 7)
        this.prevWeeklyRef = this._ref.child("weekly").child((new Date().getDay() % 7).toString());

        // not monthly but all 30 days
        this.currentMonthlyRef = this._ref.child("monthly").child((PlayerStatsUpdater.dayOfYear(new Date()) % 30).toString());
        this.prevMonthlyRef = this._ref.child("monthly").child(((PlayerStatsUpdater.dayOfYear(new Date()) - 1) % 30).toString());
        
        this.finishedRef = this._ref.child("finished");

        UpdateService.registerAllPlayerGameInfosUpdater((gameInfos, player, playerInfo) => this.update(gameInfos, player, playerInfo), this.id);
    }

    async start(): Promise<any> {
        this.eachInterval(() => this.updateDataFromUpdateRef(14, this.dailyRef, this.prevWeeklyRef));

        this.eachInterval(() => this.updateDataFromUpdateRef(10, this.currentWeeklyRef, this.prevMonthlyRef));

        this.eachInterval(() => this.updateDataFromUpdateRef(12, this.currentMonthlyRef, this.finishedRef));

        setInterval(()=>{
            let f = this.queue.values().next().value;

            if(f){
                f();
                this.queue.delete(f);
            }
        }, 30*1000);

        return;
    }

    private update(gameInfos: Map<GameType, PlayerGameInfo>, player: Player, playerInfo: PlayerInfo) {
        if (playerInfo.uuid !== "") {
            let tempDate = new Date();
            tempDate.setHours(0, 0, 0, 0);

            const date: string = tempDate.getTime().toString();

            const playerRef = this.dataRef.child(player.uuid);

            const gameInfosArr = [...gameInfos.values()]
        
            // save total achievements
            const totalAchievements = PlayerStatsUpdater.countUnlockedAchievements(playerInfo, gameInfosArr)
            playerRef.child("achievements").child("total").child(date).set(totalAchievements);
            playerRef.child('data').child("achievements").child("total").set(totalAchievements);
        
            // save total points
            const totalPoints = PlayerStatsUpdater.countTotalPoints(gameInfosArr)
            playerRef.child("points").child("total").child(date).set(totalPoints);
            playerRef.child('data').child("points").child("total").set(totalPoints);


            // save points for each gametype
            gameInfosArr
                .filter(info => info.hasOwnProperty("points"))
                .forEach(info => {
                    playerRef.child("points").child(info.type.id).child(date).set(info.points)
                    playerRef.child('data').child("points").child(info.type.id).set(info.points);
                });

            // save achievement count for each gametype
            gameInfosArr
                .filter(info => info.hasOwnProperty("achievements"))
                .filter((info: any) => info.achievements)
                .forEach((info: any) => {
                    let count = (info.achievements as Achievement[]).filter(a => a.unlocked).length;

                    playerRef.child("achievements").child(info.type.id).child(date).set(count);
                    playerRef.child('data').child("achievements").child(info.type.id).set(count);
                });

            if (playerInfo.achievements) {
                const count = playerInfo.achievements.filter(a => a.unlocked).length
                // save global achievements
                playerRef.child("achievements").child("global").child(date).set(count);
                playerRef.child('data').child("achievements").child('global').set(count);

            }

            // save medals and tokens
            playerRef.child("medals").child(date).set(playerInfo.medals);
            playerRef.child('data').child("medals").set(playerInfo.medals);
            playerRef.child("tokens").child(date).set(playerInfo.tokens);
            playerRef.child('data').child("tokens").set(playerInfo.tokens);

            return true;
        }
    }

    async updatePlayerDate(player: Player): Promise<boolean> {
        await this.addToQueue();

        try {
            await UpdateService.requestAllPlayerGameInfosUpdate(player, this.interval);

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
        return new Promise((resolve) => {
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
        return Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / (24 * 60 * 60 * 1000));
    }
}
import {Updater} from "./Updater";
import {Achievement, GameTypes, Player, PlayerGameInfo, PlayerInfo} from "hive-api";

const ONE_DAY = 24*60*60*1000;

export class PlayerStatsUpdater extends Updater {
    dataRef: admin.database.Reference;
    dailyRef: admin.database.Reference;
    currentWeeklyRef: admin.database.Reference;
    prevWeeklyRef: admin.database.Reference;
    currentMonthlyRef: admin.database.Reference;
    prevMonthlyRef: admin.database.Reference;

    queue: Set<()=>void> = new Set();

    constructor(db: admin.database.Database) {
        super(db.ref("playerStats"));

        this.dataRef = this._ref.child("data");
        this.dailyRef = this._ref.child("daily");
        this.currentWeeklyRef = this._ref.child("weekly").child((new Date()).getDay().toString());

        // weekly ref of next day (current day + 1 mod 7)
        this.prevWeeklyRef = this._ref.child("weekly").child((((new Date()).getDay()) % 7).toString());

        // not monthly but all 30 days
        this.currentMonthlyRef = this._ref.child("monthly").child((PlayerStatsUpdater.dayOfYear(new Date()) % 30).toString());
        this.prevMonthlyRef = this._ref.child("monthly").child(((PlayerStatsUpdater.dayOfYear(new Date()) - 1) % 30).toString());
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

    async updatePlayerDate(player: Player): Promise<boolean> {
        await this.addToQueue();

        try {
            let playerInfo: PlayerInfo = await player.info(ONE_DAY);

            if (playerInfo.uuid !== "") {
                // load the PlayerGameInfos for all GameTypes
                let promises: Promise<PlayerGameInfo>[] = GameTypes.list.map(type => player.gameInfo(type, ONE_DAY));
                let gameInfos: PlayerGameInfo[] = await Promise.all(promises);

                let date: string = new Date().getTime().toString();

                let playerRef = this.dataRef.child(player.uuid);

                // save total achievements
                playerRef.child("achievements").child("total").child(date).set(
                    PlayerStatsUpdater.countUnlockedAchievements(playerInfo, gameInfos)
                );

                // save total points
                playerRef.child("points").child("total").child(date).set(
                    PlayerStatsUpdater.countTotalPoints(gameInfos)
                );

                // save points for each gametype
                gameInfos
                    .filter(info => info.hasOwnProperty("points"))
                    .forEach(info => {
                        playerRef.child("points").child(info.type.id).child(date).set(info.points)
                    });

                // save achievement count for each gametype
                gameInfos
                    .filter(info => info.hasOwnProperty("achievements"))
                    .filter((info: any) => info.achievements)
                    .forEach((info: any) => {
                        let count = (info.achievements as Achievement[]).filter(a => a.unlocked).length;

                        playerRef.child("achievements").child(info.type.id).child(date).set(count);
                    });

                if(playerInfo.achievements) {
                    // save global achievements
                    playerRef.child("achievements").child("global").child(date)
                        .set(playerInfo.achievements.filter(a => a.unlocked).length);
                }

                // save medals and tokens
                playerRef.child("medals").child(date).set(playerInfo.medals);
                playerRef.child("tokens").child(date).set(playerInfo.tokens);

                return true;
            }else{
                return false;
            }

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
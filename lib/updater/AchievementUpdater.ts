import {GameTypes, Player, Achievement} from "hive-api"
import {LeaderboardUpdater} from "./LeaderboardUpdater"

export class AchievementUpdater extends LeaderboardUpdater{
    protected _gamedataRef: admin.database.Reference;

    constructor(db: admin.database.Database) {
        super(db.ref("achievementLeaderboard"), "achievements", 100, 30*1000, 1000 * 60 * 60 * 6);

        this._gamedataRef = this._ref.child("gamedata");
    }

    async updateInfo(player: Player): Promise<any> {
        return player.info(3*60*60*1000).then(async (info)=>{
            let achievementCount: number = 0;

            await Promise.all(
                GameTypes.list.filter(type => type.playerGameInfoFactory.achievements !== undefined).map(type => {
                    return player.gameInfo(type, 6*60*60*1000)
                        .then((info: any) => info.achievements)
                        .then((achievements: Achievement[]) => {
                        // after 1.1.2010 so we only get unlocked
                        let gameTypeCount = 0;

                        if(achievements){
                            gameTypeCount =
                                achievements.filter(a => a.unlockedAt.getTime() >= 1262300400000).length;
                        }


                        this._gamedataRef.child(player.uuid).child(type.id).set(gameTypeCount);

                        achievementCount += gameTypeCount;

                        return;
                    })
                })
            );

            let globalCount = 0;

            if(info.achievements){
                globalCount += info.achievements.filter(a => a.unlockedAt.getTime() >= 1262300400000).length;
            }

            this._gamedataRef.child(player.uuid).child("GLOBAL").set(globalCount);
            this._gamedataRef.child(player.uuid).child("name").set(info.name);

            achievementCount += globalCount;

            this._dataRef.child(player.uuid).update({
                achievements: achievementCount,
                name: info.name
            });
        })
    }
}


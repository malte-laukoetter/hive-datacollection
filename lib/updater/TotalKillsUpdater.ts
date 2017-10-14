import {GameTypes, HidePlayerGameInfo, Player} from "hive-api"
import {LeaderboardUpdater} from "./LeaderboardUpdater"

export class TotalKillsUpdater extends LeaderboardUpdater{
    protected _gamedataRef: admin.database.Reference;

    constructor(db: admin.database.Database) {
        super(db.ref("totalKillsLeaderboard"), "kills", 100, 30*1000, 1000 * 60 * 60 * 6);

        this._gamedataRef = this._ref.child("gamedata");
    }

    async start() {
        await GameTypes.update();

        return super.start();
    }

    async updateInfo(player: Player): Promise<any> {
        return player.info(3*60*60*1000).then(async (info)=>{
            let kills = await Promise.all(
                GameTypes.list.filter(type => type.playerGameInfoFactory.kills !== undefined).map(type => {
                    return player.gameInfo(type, 6*60*60*1000).then((info: any) => {
                        if(info.kills){
                            this._gamedataRef.child(player.uuid).child(type.id).set(info.kills);
                            return info.kills;
                        }

                        return 0;
                    })}
                )
            );

            await player.gameInfo(GameTypes.HIDE, 6*60*60*1000).then((info: HidePlayerGameInfo) => {
                if(info.hiderKills && info.seekerKills){
                this._gamedataRef.child(player.uuid).child(GameTypes.HIDE.id).set(info.hiderKills + info.seekerKills);
                kills.push(info.hiderKills + info.seekerKills);

                }

            });

            this._gamedataRef.child(player.uuid).child("name").set(info.name);
            this._dataRef.child(player.uuid).update({
                kills: kills.reduce((a,b)=> a+b),
                name: info.name
            });
        })
    }
}


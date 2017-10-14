import {GameTypes, Player} from "hive-api"
import {LeaderboardUpdater} from "./LeaderboardUpdater"

export class TotalPointsUpdater extends LeaderboardUpdater{
    protected _gamedataRef: admin.database.Reference;

    constructor(db: admin.database.Database) {
        super(db.ref("totalPointsLeaderboard"), "points", 100, 30*1000, 1000 * 60 * 60 * 6);

        this._gamedataRef = this._ref.child("gamedata");
    }

    async start() {
        await GameTypes.update();

        return super.start();
    }

    async updateInfo(player: Player): Promise<any> {
        return player.info(3*60*60*1000).then(async (info)=>{
            let points = await Promise.all(
                GameTypes.list.map(type => {
                    return player.gameInfo(type, 6*60*60*1000).then(info => info.points).then(points => {
                        this._gamedataRef.child(player.uuid).child(type.id).set(points);

                        return points;
                    })}
                )
            );

            this._gamedataRef.child(player.uuid).child("name").set(info.name);
            this._dataRef.child(player.uuid).update({
                points: points.reduce((a,b)=> a+b),
                name: info.name
            });
        })
    }
}


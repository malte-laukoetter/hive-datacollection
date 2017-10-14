import {Player} from "hive-api"
import {LeaderboardUpdater} from "./LeaderboardUpdater"

export class MedalUpdater extends LeaderboardUpdater {
    constructor(db: admin.database.Database) {
        super(db.ref("medalLeaderboard"), "medals", 200, 10 * 1000, 1000 * 60 * 60);
    }

    async updateInfo(player: Player): Promise<any> {
        return player.info(60*60*1000).then(info => {
            return this._dataRef.child(player.uuid).update({
                medals: info.medals,
                name: info.name
            });
        });
    }
}


import { Player, PlayerInfo } from "hive-api"
import { LeaderboardUpdater } from "./LeaderboardUpdater"
import { UpdateService } from "./UpdateService";
import { database } from "firebase-admin";

export class MedalUpdater extends LeaderboardUpdater {
    constructor(db: database.Database) {
        super(db.ref("medalLeaderboard"), "medals", 200, 10 * 1000, 1000 * 60 * 60);

        UpdateService.registerPlayerInfoUpdater(info=>this.update(info), 'Medal Leaderboard');
    }

    private update(info: PlayerInfo){
        this._dataRef.child(info.uuid).update({
            medals: info.medals,
            name: info.name
        });
    }

    async requestUpdate(player: Player): Promise<any> {
        return UpdateService.requestPlayerInfoUpdate(player, this._intervalUpdate);
    }
}

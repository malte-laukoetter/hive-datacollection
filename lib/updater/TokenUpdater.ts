import { Player, PlayerInfo, Ranks } from "hive-api"
import { LeaderboardUpdater } from "./LeaderboardUpdater"
import { UpdateService } from "./UpdateService"
import { database } from "firebase-admin";

export class TokenUpdater extends LeaderboardUpdater {
    static readonly BLOCKED_RANKS = [Ranks.VIP, Ranks.DEVELOPER, Ranks.OWNER, Ranks.YOUTUBER, Ranks.STREAMER, Ranks.CONTRIBUTOR]

    constructor(db: database.Database) {
        super(db.ref("tokenLeaderboard"), "tokens", 200, 10 * 1000, 1000 * 60 * 60);
    
        UpdateService.registerPlayerInfoUpdater(info => this.update(info), 'Token Leaderboard');
    }

    private update(info: PlayerInfo) {
        if (TokenUpdater.BLOCKED_RANKS.filter(rank => rank.name == info.rank.name).length == 0) {
            this._dataRef.child(info.uuid).update({
                tokens: info.tokens,
                name: info.name
            });
        } else {
            this._dataRef.child(info.uuid).remove();
        }
    }

    async requestUpdate(player: Player): Promise<any> {
        return UpdateService.requestPlayerInfoUpdate(player, this._intervalUpdate);
    }
}

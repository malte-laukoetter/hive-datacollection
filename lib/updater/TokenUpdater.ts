import { Player, PlayerInfo, Rank } from "hive-api"
import { LeaderboardUpdater } from "./LeaderboardUpdater"
import { UpdateService } from "./UpdateService"

export class TokenUpdater extends LeaderboardUpdater {
    static readonly BLOCKED_RANKS = [Rank.VIP, Rank.DEVELOPER, Rank.OWNER]

    constructor(db: admin.database.Database) {
        super(db.ref("tokenLeaderboard"), "tokens", 200, 10 * 1000, 1000 * 60 * 60);
    
        UpdateService.registerPlayerInfoUpdater(info => this.update(info), 'Token Leaderboard');
    }

    private update(info: PlayerInfo) {
        if (TokenUpdater.BLOCKED_RANKS.indexOf(info.rank) == -1) {
        
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

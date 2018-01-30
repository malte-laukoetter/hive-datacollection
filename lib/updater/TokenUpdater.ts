import { Player, PlayerInfo, Ranks } from "hive-api"
import { PlayerInfoLeaderboardUpdater } from "./LeaderboardUpdater"
import { UpdateService } from "./UpdateService"
import { database } from "firebase-admin";

export class TokenUpdater extends PlayerInfoLeaderboardUpdater {
    static readonly BLOCKED_RANKS = [Ranks.VIP, Ranks.DEVELOPER, Ranks.OWNER, Ranks.YOUTUBER, Ranks.STREAMER, Ranks.CONTRIBUTOR];
    readonly id = `leaderboard_tokens`

    constructor(db: database.Database) {
        super(db.ref("tokenLeaderboard"), "tokens", 200);
    }

    update(info: PlayerInfo) {
        if (TokenUpdater.BLOCKED_RANKS.filter(rank => rank.name == info.rank.name).length == 0) {
            this._dataRef.child(info.uuid).update({
                tokens: info.tokens,
                name: info.name
            });
        } else {
            this._dataRef.child(info.uuid).remove();
        }
    }
}

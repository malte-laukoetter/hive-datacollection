import {Player, Rank} from "hive-api"
import {LeaderboardUpdater} from "./LeaderboardUpdater"

export class TokenUpdater extends LeaderboardUpdater{
    constructor(db: admin.database.Database) {
        super(db.ref("tokenLeaderboard"), "tokens", 200, 10 * 1000, 1000 * 60 * 60);
    }

    async updateInfo(player: Player): Promise<any> {
        return player.info(60*60*1000).then(info => {
            if(info.rank === Rank.VIP || info.rank === Rank.DEVELOPER || info.rank === Rank.OWNER){
                this._dataRef.child(player.uuid).remove();

                throw new Error("player is vip / dev / owner")
            }

            return this._dataRef.child(player.uuid).update({
                tokens: info.tokens,
                name: info.name
            });
        });
    }
}

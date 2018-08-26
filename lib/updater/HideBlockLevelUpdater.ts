import { GameTypes, Player, PlayerInfo, HidePlayerGameInfo } from "hive-api"
import { LeaderboardUpdater } from "./LeaderboardUpdater"
import { UpdateService } from "./UpdateService"
import { database } from "firebase-admin";

export class HideBlocklevelUpdater extends LeaderboardUpdater {
    static id = 'leaderboard_hide_blocklevels'
    get id() { return HideBlocklevelUpdater.id; }

    constructor() {
        super(database().ref(HideBlocklevelUpdater.id), "value", 100, 30 * 1000);

        UpdateService.registerPlayerGameInfoUpdater(
            GameTypes.HIDE,
            (info, player, playerInfo) => this.update(info as HidePlayerGameInfo, player, playerInfo),
            this.id
        );
    }

    private update(gameInfo: HidePlayerGameInfo, player: Player, playerInfo: PlayerInfo) {
        const totalExp = Object.values(gameInfo.blockExperience).reduce((acc: number, level: number) => acc + level, 0)

        this._dataRef.child(player.uuid).update({
            value: totalExp,
            name: player.name
        });
    }

    async requestUpdate(player: Player): Promise<any> {
        return UpdateService.requestPlayerGameInfosUpdate([GameTypes.HIDE], player, this.interval)
    }
}


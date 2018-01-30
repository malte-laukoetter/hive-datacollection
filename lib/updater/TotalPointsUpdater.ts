import { GameType, GameTypes, Player, PlayerGameInfo, PlayerInfo } from "hive-api"
import { LeaderboardUpdater } from "./LeaderboardUpdater"
import { UpdateService } from "./UpdateService";
import { database } from "firebase-admin";

export class TotalPointsUpdater extends LeaderboardUpdater {
    private static readonly GAME_TYPES_WITH_POINTS: GameType[] = GameTypes.list.filter(type => type.playerGameInfoFactory.points !== undefined);
    get id() { return `leaderboard_points`; }

    constructor(db: database.Database) {
        super(db.ref("totalPointsLeaderboard"), "points", 100, 30*1000);

        UpdateService.registerPlayerGameInfosUpdater(
            TotalPointsUpdater.GAME_TYPES_WITH_POINTS,
            (info, player, playerInfos) => this.update(info, player, playerInfos),
            this.id
        );
    }

    private update(gameInfos: Map<GameType, PlayerGameInfo>, player: Player, playerInfos: PlayerInfo) {
        const points = [...gameInfos.values()].filter(gameInfo => gameInfo.points).map(gameInfo => gameInfo.points);

        this._dataRef.child(player.uuid).update({
            points: points.reduce((a, b) => a + b, 0),
            name: playerInfos.name
        });
    }

    async requestUpdate(player: Player): Promise<any> {
        return UpdateService.requestPlayerGameInfosUpdate(TotalPointsUpdater.GAME_TYPES_WITH_POINTS, player, this.interval)
    }
}


import { GameType, GameTypes, Player, PlayerGameInfo } from "hive-api"
import { LeaderboardUpdater } from "./LeaderboardUpdater"
import { UpdateService } from "./UpdateService";

export class TotalPointsUpdater extends LeaderboardUpdater {
    private static readonly GAME_TYPES_WITH_POINTS: GameType[] = GameTypes.list.filter(type => type.playerGameInfoFactory.points !== undefined);
    protected _gamedataRef: admin.database.Reference;

    constructor(db: admin.database.Database) {
        super(db.ref("totalPointsLeaderboard"), "points", 100, 30*1000, 1000 * 60 * 60 * 6);

        this._gamedataRef = this._ref.child("gamedata");

        UpdateService.registerPlayerGameInfosUpdater(
            TotalPointsUpdater.GAME_TYPES_WITH_POINTS,
            (info, player, playerInfos) => this.update(info, player),
            'Total Points Leaderboard'
        );
    }

    private update(gameInfos: Map<GameType, PlayerGameInfo>, player: Player) {
        const points = [...gameInfos.entries()].map(([type, gameInfo]) => {
            if(gameInfo.points){
                this._gamedataRef.child(player.uuid).child(type.id).set(gameInfo.points);

                return gameInfo.points;
            }
            
            return 0;
        });

        this._gamedataRef.child(player.uuid).child("name").set(player.name);
        this._dataRef.child(player.uuid).update({
            points: points.reduce((a, b) => a + b),
            name: player.name
        });
    }

    async requestUpdate(player: Player): Promise<any> {
        return UpdateService.requestPlayerGameInfosUpdate(TotalPointsUpdater.GAME_TYPES_WITH_POINTS, player, this._intervalUpdate)
    }
}


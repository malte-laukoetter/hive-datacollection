import { GameTypes, GameType, Player, Achievement, PlayerGameInfo, PlayerInfo, HidePlayerGameInfo } from "hive-api"
import { LeaderboardUpdater } from "./LeaderboardUpdater"
import { UpdateService } from "./UpdateService"
import { database } from "firebase-admin";

export class GamesPlayedUpdater extends LeaderboardUpdater {
    private static readonly GAME_TYPES_WITH_GAMES_PLAYED: GameType[] = 
         [
        GameTypes.BP,
        GameTypes.DR,
        GameTypes.HIDE,
        GameTypes.SP,
        GameTypes.TIMV,
        GameTypes.SKY,
        GameTypes.DRAW,
        GameTypes.GRAV,
        GameTypes.BED,
      ].filter(type => type.playerGameInfoFactory.gamesPlayed !== undefined);
    get id() { return `leaderboard_games_played`; }

    constructor() {
        super(database().ref("gamesPlayedLeaderboard"), "games", 100, 30*1000);

        UpdateService.registerPlayerGameInfosUpdater(
            GamesPlayedUpdater.GAME_TYPES_WITH_GAMES_PLAYED,
            (info, player, playerInfos) => this.update(info, player, playerInfos),
            this.id
        );
    }

    private update(gameInfos: Map<GameType, PlayerGameInfo>, player: Player, playerInfos: PlayerInfo) {
        const gamesPlayed = [... gameInfos.entries()].map(([type, gameInfo]) => {
            if ((gameInfo as any).gamesPlayed){
                return (gameInfo as any).gamesPlayed;
            }

            return 0;
        });

        this._dataRef.child(player.uuid).update({
            games: gamesPlayed.reduce((a, b) => a + b, 0),
            name: playerInfos.name
        });
    }

    async requestUpdate(player: Player): Promise<any> {
        return UpdateService.requestPlayerGameInfosUpdate(GamesPlayedUpdater.GAME_TYPES_WITH_GAMES_PLAYED, player, this.interval)
    }
}


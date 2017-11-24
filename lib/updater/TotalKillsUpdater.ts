import { GameTypes, GameType, Player, Achievement, PlayerGameInfo, PlayerInfo, HidePlayerGameInfo } from "hive-api"
import { LeaderboardUpdater } from "./LeaderboardUpdater"
import { UpdateService } from "./UpdateService"

export class TotalKillsUpdater extends LeaderboardUpdater {
    private static readonly GAME_TYPES_WITH_KILLS: GameType[] = 
        [... GameTypes.list.filter(type => type.playerGameInfoFactory.kills !== undefined), GameTypes.HIDE];
    protected _gamedataRef: admin.database.Reference;

    constructor(db: admin.database.Database) {
        super(db.ref("totalKillsLeaderboard"), "kills", 100, 30*1000, 1000 * 60 * 60 * 6);

        this._gamedataRef = this._ref.child("gamedata");

        UpdateService.registerPlayerGameInfosUpdater(
            TotalKillsUpdater.GAME_TYPES_WITH_KILLS,
            (info, player, playerInfos) => this.update(info, player),
            'Total Kills Leaderboard'
        );
    }

    private update(gameInfos: Map<GameType, PlayerGameInfo>, player: Player) {
        const kills = [... gameInfos.entries()].map(([type, gameInfo]) => {

            if (gameInfo instanceof HidePlayerGameInfo && gameInfo.hiderKills && gameInfo.seekerKills) {
                this._gamedataRef.child(player.uuid).child(GameTypes.HIDE.id).set(gameInfo.hiderKills + gameInfo.seekerKills);
                    
                return gameInfo.hiderKills + gameInfo.seekerKills;
            } else if ((gameInfo as any).kills){
                this._gamedataRef.child(player.uuid).child(type.id).set((gameInfo as any).kills);
                return (gameInfo as any).kills;
            }

            return 0;
        });

        this._gamedataRef.child(player.uuid).child("name").set(player.name);
        this._dataRef.child(player.uuid).update({
            kills: kills.reduce((a, b) => a + b),
            name: player.name
        });
    }

    async requestUpdate(player: Player): Promise<any> {
        return UpdateService.requestPlayerGameInfosUpdate(TotalKillsUpdater.GAME_TYPES_WITH_KILLS, player, this._intervalUpdate)
    }
}


import { GameTypes, GameType, Player, Achievement, PlayerGameInfo, PlayerInfo } from "hive-api"
import { LeaderboardUpdater } from "./LeaderboardUpdater"
import { UpdateService } from "./UpdateService";
import { database } from "firebase-admin";

export class AchievementUpdater extends LeaderboardUpdater {
    private static readonly GAME_TYPES_WITH_ACHIEVEMENTS: GameType[] = GameTypes.list.filter(type => type.playerGameInfoFactory.achievements !== undefined);
    protected _gamedataRef: database.Reference;

    readonly id = `leaderboard_achievements`;

    constructor(db: database.Database) {
        super(db.ref("achievementLeaderboard"), "achievements", 100, 30*1000);

        this._gamedataRef = this._ref.child("gamedata");

        UpdateService.registerPlayerGameInfosUpdater(
            AchievementUpdater.GAME_TYPES_WITH_ACHIEVEMENTS,
            (info, player, playerInfos) => this.update(info, player, playerInfos),
            this.id
        );
    }

    private update(gameInfos: Map<GameType, PlayerGameInfo>, player: Player, playerInfo: PlayerInfo){
        let achievementCount: number = 0;        

        gameInfos.forEach((info: any, type: GameType) => {
            // after 1.1.2010 so we only get unlocked
            let gameTypeCount = 0;

            if (info.achievements) {
                gameTypeCount =
                    info.achievements.filter(a => a.unlockedAt.getTime() >= 1262300400000).length;
            }

            achievementCount += gameTypeCount;

            return;
        });

        let globalCount = 0;

        if (playerInfo.achievements) {
            globalCount += playerInfo.achievements.filter(a => a.unlockedAt.getTime() >= 1262300400000).length;
        }

        achievementCount += globalCount;

        this._dataRef.child(player.uuid).update({
            achievements: achievementCount,
            name: playerInfo.name
        });
    }

    async requestUpdate(player: Player): Promise<any> {
        return Promise.all([
            UpdateService.requestPlayerGameInfosUpdate(AchievementUpdater.GAME_TYPES_WITH_ACHIEVEMENTS, player, this.interval),
            UpdateService.requestPlayerInfoUpdate(player, this.interval)
        ]);
    }
}


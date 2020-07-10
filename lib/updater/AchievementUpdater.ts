import { GameTypes, GameType, Player, Achievement, PlayerGameInfo, PlayerInfo, PlayerGameInfoAchievements } from "hive-api"
import { LeaderboardUpdater } from "./LeaderboardUpdater"
import { UpdateService } from "./UpdateService";
import { database } from "firebase-admin";

export class AchievementUpdater extends LeaderboardUpdater {
         private static readonly GAME_TYPES_WITH_ACHIEVEMENTS: GameType[] = [
           GameTypes.BP,
           GameTypes.DR,
           GameTypes.HIDE,
           GameTypes.SP,
           GameTypes.TIMV,
           GameTypes.DRAW,
           GameTypes.GRAV,
           GameTypes.BED,
         ].filter(
           (type) => type.playerGameInfoFactory.achievements !== undefined
         );

         get id() {
           return `leaderboard_achievements`;
         }

         constructor() {
           super(
             database().ref("achievementLeaderboard"),
             "achievements",
             100,
             30 * 1000
           );

           UpdateService.registerPlayerGameInfosUpdater(
             AchievementUpdater.GAME_TYPES_WITH_ACHIEVEMENTS,
             (info, player, playerInfos) =>
               this.update(info, player, playerInfos),
             this.id
           );
         }

         private async update(
           gameInfos: Map<GameType, PlayerGameInfo>,
           player: Player,
           playerInfo: PlayerInfo
         ) {
           let achievementCount: number = 0;

           for (const [, info] of gameInfos) {
             // instance of doesn't work with Interfaces so we need to use this workaround... :(
             if ((info as any).achievements) {
               const _info: PlayerGameInfoAchievements = info as any;

               for (const achievement of _info.achievements) {
                 const achievementInfo = await achievement.info();

                 // after 1.1.2010 so we only get unlocked
                 if (
                   !achievementInfo.noLongerOptainable &&
                   achievement.unlockedAt.getTime() >= 1262300400000
                 ) {
                   achievementCount = achievementCount + 1;
                 }
               }
             }
           }

           if (playerInfo.achievements) {
             achievementCount += playerInfo.achievements.filter(
               (a) => a.unlockedAt.getTime() >= 1262300400000
             ).length;
           }

           this._dataRef.child(player.uuid).update({
             achievements: achievementCount,
             name: playerInfo.name,
           });
         }

         async requestUpdate(player: Player): Promise<any> {
           return Promise.all([
             UpdateService.requestPlayerGameInfosUpdate(
               AchievementUpdater.GAME_TYPES_WITH_ACHIEVEMENTS,
               player,
               this.interval
             ),
             UpdateService.requestPlayerInfoUpdate(player, this.interval),
           ]);
         }
       }


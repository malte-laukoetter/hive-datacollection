import { PlayerInfo, Player, PlayerGameInfo, GameType, GameTypes } from 'hive-api';
import { Updater } from '../updater/Updater';

export type PlayerInfoUpdateFunction = (playerInfo: PlayerInfo, player: Player) => void;
export type PlayerGameInfoUpdateFunction = (gameType: GameType, gameInfo: PlayerGameInfo, player: Player) => void;
export type PlayerGameInfosUpdateFunction = (gameInfos: Map<GameType, PlayerGameInfo>, player: Player, playerInfo: PlayerInfo) => void;

export class UpdateService {
  private static playerInfoUpdater: Set<PlayerInfoUpdateFunction> = new Set();
  private static playerGameInfoUpdater: Set<PlayerGameInfoUpdateFunction> = new Set();
  private static playerGameInfosUpdater: Set<{ types: GameType[], func: PlayerGameInfosUpdateFunction, lastCalls: Map<string, number> }> = new Set();

  private static playerGameInfosCache: Map<string, Map<GameType, PlayerGameInfo>> = new Map();
  private static playerInfoCache: Map<string, PlayerInfo> = new Map();

  /**
   * registers a function to be called everytime the infos of a player are updated
   * @param updateFunction function that is called with each update
   */
  static registerPlayerInfoUpdater(updateFunction: PlayerInfoUpdateFunction, name = updateFunction.name){
    console.log(`Registered PlayerInfoUpdater: ${name}`)
    UpdateService.playerInfoUpdater.add(updateFunction);
  }

  /**
   * requests an update of the player infos, after the update has happened all functions registered with registerPlayerInfoUpdater will be called with the new infos
   */
  static requestPlayerInfoUpdate(player: Player, maxCacheAge: number = 60 * 60 * 1000){
    return player
      .info(maxCacheAge)
      .then( info => {
        UpdateService.playerInfoUpdater.forEach(
          updater => updater(info, player)
        );

        UpdateService.playerInfoCache.set(player.uuid, info);

        UpdateService.sendPlayerGameInfosUpdates(player);
      })
      .catch(err => Updater.sendError(err, `player/${player.uuid}`));
  }

  static registerPlayerGameInfoUpdater(updateFunction: PlayerGameInfoUpdateFunction, name = updateFunction.name){
    console.log(`Registered PlayerGameInfoUpdater: ${name}`);
    UpdateService.playerGameInfoUpdater.add(updateFunction);
  }

  static registerPlayerGameInfosUpdater(gameTypes: GameType[], updateFunction: PlayerGameInfosUpdateFunction, name = updateFunction.name){
    console.log(`Registered PlayerGameInfosUpdater: ${name}`);
    UpdateService.playerGameInfosUpdater.add({ types: gameTypes, func: updateFunction, lastCalls: new Map() });
  }

  static registerAllPlayerGameInfosUpdater(updateFunction: PlayerGameInfosUpdateFunction, name = updateFunction.name){
    console.log(`Registered AllPlayerGameInfosUpdater: ${name}`);
    UpdateService.playerGameInfosUpdater.add({ types: GameTypes.list, func: updateFunction, lastCalls: new Map() });
  }

  static requestPlayerGameInfoUpdate(gameType: GameType, player: Player, maxCacheAge: number = 60 * 60 * 1000){
    return player
      .gameInfo(gameType, maxCacheAge)
      .then( info => {
        UpdateService.playerGameInfoUpdater.forEach(
          updater => updater(gameType, info, player)
        );

        UpdateService.updatePlayerGameInfosCache(gameType, player, info);
      })
      .catch(err => Updater.sendError(err, `player/${player.uuid}/${gameType.id}`));
  }

  static requestPlayerGameInfosUpdate(gameTypes: GameType[], player: Player, maxCacheAge: number = 60 * 60 * 1000){
    UpdateService.requestPlayerInfoUpdate(player, 1000 * 60 * 60 * 24 * 30); // we just need to make sure it is in the cache
    
    return gameTypes.map(gameType => 
      UpdateService.requestPlayerGameInfoUpdate(gameType, player, maxCacheAge)
    );
  }

  static requestAllPlayerGameInfosUpdate(player: Player, maxCacheAge: number = 60 * 60 * 1000){
    return UpdateService.requestPlayerGameInfosUpdate(GameTypes.list, player, maxCacheAge);
  }

  private static updatePlayerGameInfosCache(gameType: GameType, player: Player, info: PlayerGameInfo){
    if (!UpdateService.playerGameInfosCache.has(player.uuid)){
      UpdateService.playerGameInfosCache.set(player.uuid, new Map());
    }

    const gameInfoCache = UpdateService.playerGameInfosCache.get(player.uuid);
    
    gameInfoCache.set(gameType, info);

    UpdateService.sendPlayerGameInfosUpdates(player);
  }

  static sendPlayerGameInfosUpdates(player: Player){
    if (!UpdateService.playerGameInfosCache.has(player.uuid)) {
      UpdateService.playerGameInfosCache.set(player.uuid, new Map());
    }

    const gameInfoCache = UpdateService.playerGameInfosCache.get(player.uuid);
    
    UpdateService.playerGameInfosUpdater.forEach(({ types: types, func: updater, lastCalls: lastCalls }) => {
      const cachedGameInfoTypes = [...gameInfoCache.keys()].map(type => type.id);

      const missingGameInfos = types
        .map(type => type.id)
        .filter(id => cachedGameInfoTypes.indexOf(id) == -1)
        .length;

      if (missingGameInfos == 0 && UpdateService.playerInfoCache.has(player.uuid)) {
        // we don't want to call it to often so we limit it to once every 5 min
        if (lastCalls.has(player.uuid) && lastCalls.get(player.uuid) > (new Date().getTime() - 5 * 60 * 1000)) {
          return;
        }

        lastCalls.set(player.uuid, new Date().getTime());

        
        const gameInfos = new Map();

        types.forEach(type => gameInfos.set(type, gameInfoCache.get(type)));

        updater(gameInfos, player, UpdateService.playerInfoCache.get(player.uuid));
      }
    });
  }
}
import { GameMap, Player } from "hive-api";
import { ChangeType } from "../updater/TeamUpdater";

export interface NotificationSubscriber {
  send(message);
  sendNewMap(map: GameMap);
  sendTeamChange(player: Player, type: ChangeType);
  sendCount(type, count: Number);
  sendTweet(tweetData);
}

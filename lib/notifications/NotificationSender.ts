import { GameMap, Player } from "hive-api";
import { NotificationSubscriber } from "./NotificationSubscriber";
import { ChangeType } from "../updater/TeamUpdater";

export class NotificationSender {
  private static subscriptions: Set<NotificationSubscriber> = new Set();

  static register(subscriber: NotificationSubscriber) {
    NotificationSender.subscriptions.add(subscriber);
  }

  static unregister(subscriber: NotificationSubscriber) {
    NotificationSender.subscriptions.delete(subscriber);
  }

  static sendCount(type, count: Number) {
    NotificationSender.subscriptions.forEach(sub => sub.sendCount(type, count))
  }

  static send(message) {
    NotificationSender.subscriptions.forEach(sub => sub.send(message));
  }

  static sendNewMap(map: GameMap) {
    NotificationSender.subscriptions.forEach(sub => sub.sendNewMap(map));
  }

 static sendTeamChange(player: Player, type: ChangeType) {
   NotificationSender.subscriptions.forEach(sub => sub.sendTeamChange(player, type));
  }
}

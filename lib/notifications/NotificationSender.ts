import { GameMap, Player } from "hive-api";
import { NotificationSubscriber } from "./NotificationSubscriber";
import { ChangeType } from "../updater/TeamUpdater";

export class NotificationSender {
  private static _instance: NotificationSender = new NotificationSender();
  private subscriptions: Set<NotificationSubscriber> = new Set();

  constructor() { }

  static get instance(): NotificationSender {
    return NotificationSender._instance;
  }

  register(subscriber: NotificationSubscriber) {
    this.subscriptions.add(subscriber);
  }

  sendCount(type, count: Number) {
    this.subscriptions.forEach(sub => sub.sendCount(type, count))
  }

  send(message) {
    this.subscriptions.forEach(sub => sub.send(message));
  }

  sendNewMap(map: GameMap) {
    this.subscriptions.forEach(sub => sub.sendNewMap(map));
  }

  sendTeamChange(player: Player, type: ChangeType) {
    this.subscriptions.forEach(sub => sub.sendTeamChange(player, type));
  }
}

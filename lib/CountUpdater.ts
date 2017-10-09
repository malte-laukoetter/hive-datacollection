import {Updater} from "./Updater"
import { NotificationSender } from "./discordWebhook"

export abstract class CountUpdater extends Updater {
  protected currentCount: Map<Object, Number> = new Map();
  // the expression at the end adds the 1.000.000 steps
  private readonly notificationPositions = [
    10000,
    25000,
    50000,
    75000,
    100000,
    150000,
    200000,
    250000,
    500000,
    750000,
    1500000
  ].concat([...Array(100).keys()].map(a => (1 + a) * 1000000));
  private readonly countType;

  constructor(ref: admin.database.Reference, countType: String = ""){
    super(ref);
    this.countType = countType;
  }

  protected sendNotification(count: Number, type = this.countType){
    let currentCount = this.currentCount.get(type) || 0;

    let number = this.notificationPositions.find(a => a < count && a > currentCount);
    if (number && currentCount > 0){
      NotificationSender.instance.sendCount(type, number);
    }
    this.currentCount.set(type, count);
  }

}
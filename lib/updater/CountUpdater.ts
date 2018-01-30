import { NotificationSender } from "../notifications/NotificationSender"
import { database } from "firebase-admin";
import { BasicUpdater } from "./BasicUpdater";

export abstract class CountUpdater extends BasicUpdater {
  protected currentCount: Map<Object, Number> = new Map();
  // the expression at the end adds the 1.000.000 steps
  private readonly notificationPositions = [
    10000,
    25000,
    50000,
    100000,
    150000,
    250000,
    500000,
    750000,
    1500000,
    2500000
  ].concat([...Array(100).keys()].map(a => (1 + a) * 1000000));
  protected _ref: database.Reference;

  constructor(ref: database.Reference){
    super();
    this._ref = ref;
  }

  protected sendNotification(count: Number, type = this.id){
    let currentCount = this.currentCount.get(type) || 0;

    let number = this.notificationPositions.find(a => a < count && a > currentCount);
    if (number && currentCount > 0){
      NotificationSender.sendCount(type, number);
    }
    this.currentCount.set(type, count);
  }

}
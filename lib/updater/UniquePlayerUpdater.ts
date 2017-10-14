import { CountUpdater } from "./CountUpdater";
import { Server } from "hive-api";

export class UniquePlayerUpdater extends CountUpdater {
  private _interval: number;

  constructor(db: admin.database.Database) {
    super(db.ref("uniquePlayers"), "uniquePlayers");

    this._interval = 1000 * 60 * 5;
  }

  async start(): Promise<any> {
    this.updateInfo();

    setInterval(() => this.updateInfo(), this._interval);

    return null;
  }

  async updateInfo() {
    return Server.uniquePlayers(this._interval).then(amount => {
        this.sendNotification(amount);
        return this._ref.child(new Date().getTime().toString()).set(amount);
      }
    );
  }
}
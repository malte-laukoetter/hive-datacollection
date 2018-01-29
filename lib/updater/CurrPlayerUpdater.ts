import { CountUpdater } from "./CountUpdater";
import { Server } from "hive-api";
import { database } from "firebase-admin";

export class CurrPlayerUpdater extends CountUpdater {
  private _interval: number;
  private _highestCurrRef: database.Reference;
  private _highest: number = 0;

  constructor(db: database.Database) {
    super(db.ref("currPlayers"), "currPlayers");

    this._highestCurrRef = db.ref("highestPlayers");

    this._interval = 1000 * 60 * 10;
  }

  async start(): Promise<any> {
    this.updateInfo();

    setInterval(() => this.updateInfo(), this._interval);

    this._highestCurrRef.on('value', snap => {
      this._highest = snap.val();
    });

    return null;
  }

  async updateInfo() {
    return Server.currentPlayers(this._interval).then(amount => {
        this.sendNotification(amount);

        if (this._highest < amount && amount > 0){
          this._highestCurrRef.set(amount);
        }

        return this._ref.child(new Date().getTime().toString()).set(amount);
      }
    );
  }
}
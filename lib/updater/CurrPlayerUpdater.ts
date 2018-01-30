import { CountUpdater } from "./CountUpdater";
import { Server } from "hive-api";
import { database } from "firebase-admin";

export class CurrPlayerUpdater extends CountUpdater {
  private _highestCurrRef: database.Reference;
  private _highest: number = 0;

  static id = "players_current";
  readonly id = CurrPlayerUpdater.id;

  constructor(db: database.Database) {
    super(db.ref("currPlayers"));

    this._highestCurrRef = db.ref("highestPlayers");
  }

  async start(): Promise<any> {
    super.start();

    this._highestCurrRef.on('value', snap => {
      this._highest = snap.val();
    });

    return;
  }

  async updateInfo() {
    return Server.currentPlayers(this.interval).then(amount => {
        if (this._highest < amount && amount > 0){
          this._highestCurrRef.set(amount);
        }

        return this._ref.child(new Date().getTime().toString()).set(amount);
      }
    );
  }
}
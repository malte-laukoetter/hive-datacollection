/*
 * Download the Leaderboard Data and the data from 1 day, 3 days, 1 week, 1 month, 3 months, 6 months, 1 year, 2 years ... ago
 * 
 * compare the data and save pos and data changes in properties for each of these dates
 */

import * as admin from "firebase-admin"
import { GameType, Leaderboard, LeaderboardPlace } from "hive-api";
import { Updater } from "./Updater";

const ONE_DAY = 24 * 60 * 60 * 1000;

export class GameLeaderboardUpdater extends Updater {
  private _interval: number;
  private _dataRef: admin.database.Reference;

  constructor(db: admin.database.Database, private readonly gameType: GameType) {
    super(db.ref("gameLeaderboards"));

    this._dataRef = this._ref.child(gameType.id).child("data");

    this._interval = 1000 * 60 * 60 * 24;
  }

  private getDateRefForDate(date: Date){
    return this._dataRef.child(date.getTime().toString());
  }

  async start() {
    this.updateInfo();

    setInterval(() => this.updateInfo(), this._interval);

    return null;
  }

  private static removeUnimportantRaw(raw: any){
    delete raw.index;
    delete raw.humanIndex;
    delete raw.UUID;
    delete raw.username;
    
    return raw;
  }

  async updateInfo() {
    try {
      const leaderboard = new Leaderboard(this.gameType);

      leaderboard.deleteCache();

      const leaderboardPlaces = await leaderboard.load(0, 1000);

      const date = new Date();

      // negative days or month are working and calculated correctly
      const oldLeaderboardData = [
        { interval: "day",   data: await this.getDateRefForDate(new Date(date.getFullYear(),     date.getMonth(),     date.getDate() - ONE_DAY    )).once('value')},
        { interval: "day3",  data: await this.getDateRefForDate(new Date(date.getFullYear(),     date.getMonth(),     date.getDate() - ONE_DAY * 3)).once('value')},
        { interval: "week",  data: await this.getDateRefForDate(new Date(date.getFullYear(),     date.getMonth(),     date.getDate() - ONE_DAY * 7)).once('value')},
        { interval: "month", data: await this.getDateRefForDate(new Date(date.getFullYear(),     date.getMonth() - 1, date.getDate()              )).once('value')},
        { interval: "year",  data: await this.getDateRefForDate(new Date(date.getFullYear() - 1, date.getMonth(),     date.getDate()              )).once('value')}
      ];

      leaderboardPlaces.forEach((place: LeaderboardPlace) => {
        let res: any = {};

        res.uuid = place.player.uuid;
        res.name = place.player.name;
        res.place = place.place;
        res.points = place.points;
        res.raw = GameLeaderboardUpdater.removeUnimportantRaw(place.raw);
        
        oldLeaderboardData
        .filter(({data: oldData}) => oldData[place.player.uuid])
        .forEach(({interval: interval, data: oldData}) => {
          const oldPlayerData = oldData[place.player.uuid];

          res[interval] = {
            place: oldPlayerData.place - place.place,
            points: oldPlayerData.points - place.points,
            raw: Object.keys(oldPlayerData.raw).map(key => oldPlayerData.raw[key] - place.raw[key])
          }
        });

        this.getDateRefForDate(new Date(date.getFullYear(), date.getMonth(), date.getDate())).child(place.player.uuid).set(res);
      });
    } catch (err) {
      Updater.sendError(err, `leaderboard/${this.gameType.id}`);
    }
  }
}
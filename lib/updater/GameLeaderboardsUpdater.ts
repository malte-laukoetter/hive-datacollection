/*
 * Download the Leaderboard Data and the data from 1 day, 3 days, 1 week, 1 month, 6 months, 1 year ago
 * 
 * compare the data and save pos and data changes in properties for each of these dates
 */

import { GameType, Leaderboard, LeaderboardPlace } from "hive-api";
import { Updater } from "./Updater";
import { Config } from "../config/Config";
import { database } from "firebase-admin";

export class GameLeaderboardUpdater extends Updater {
  private _interval: number;
  private _dataRef: database.Reference;
  private _ref: database.Reference;

  constructor(db: database.Database, private readonly gameType: GameType) {
    super();
    this._ref = db.ref("gameLeaderboards");

    this._dataRef = this._ref.child(gameType.id).child("data");

    this._interval = 1000 * 60 * 60 * 24;
  }

  private getDateRefForDate(dateOrUtcYear: Date): database.Reference;
  private getDateRefForDate(dateOrUtcYear: number, utcMonth: number, utcDate: number): database.Reference;
  private getDateRefForDate(dateOrUtcYear: Date | number, utcMonth?: number, utcDate?: number): database.Reference{
    if(typeof dateOrUtcYear === 'number'){
      return this.getDateRefForDate(new Date(Date.UTC(dateOrUtcYear, utcMonth, utcDate)))      
    }else{
      return this._dataRef.child(dateOrUtcYear.toISOString().substr(0,10)) // ISO Date (without time)
    }
  }

  private getDateRefData(utcYear: number, utcMonth: number, utcDate: number){
    return this.getDateRefForDate(utcYear, utcMonth, utcDate).once('value').then(val => val.val())
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

    Object.entries(raw).filter(([key, val]) => typeof val !== 'number').forEach(([key]) => delete raw[key]);
    
    return raw;
  }

  async updateInfo() {
    try {
      const leaderboard = new Leaderboard(this.gameType);

      leaderboard.deleteCache();

      const leaderboardPlaces = await leaderboard.load(0, (await Config.get('game_leaderboard_size') || 1000));

      const date = new Date();

      // negative days or month are working and calculated correctly
      const oldLeaderboardData = [
        { interval: "day",     data: await this.getDateRefData(date.getFullYear(),     date.getMonth(),     date.getDate() - 1)},
        { interval: "3days",   data: await this.getDateRefData(date.getFullYear(),     date.getMonth(),     date.getDate() - 3)},
        { interval: "week",    data: await this.getDateRefData(date.getFullYear(),     date.getMonth(),     date.getDate() - 7)},
        { interval: "month",   data: await this.getDateRefData(date.getFullYear(),     date.getMonth() - 1, date.getDate()    )},
        { interval: "6months", data: await this.getDateRefData(date.getFullYear(),     date.getMonth() - 6, date.getDate()    )},
        { interval: "year",    data: await this.getDateRefData(date.getFullYear() - 1, date.getMonth(),     date.getDate()    )}
      ];

      leaderboardPlaces.forEach((place: LeaderboardPlace) => {
        let res: any = {};

        res.uuid = place.player.uuid;
        res.name = place.player.name;
        res.place = place.place;
        res.raw = GameLeaderboardUpdater.removeUnimportantRaw(place.raw);
        
        // save the changes for the old data for every player that has data from the date
        oldLeaderboardData
        .filter(({data: oldData}) => oldData && oldData[place.player.uuid])
        .forEach(({interval: interval, data: oldData}) => {
          const oldPlayerData = oldData[place.player.uuid];

          res[interval] = {
            place: place.place - oldPlayerData.place,
            raw: Object.keys(oldPlayerData.raw).map(key => place.raw[key] - oldPlayerData.raw[key])
          }
        });

        this.getDateRefForDate(date.getFullYear(), date.getMonth(), date.getDate()).child(place.player.uuid).set(res);
      });
    } catch (err) {
      Updater.sendError(err, `leaderboard/${this.gameType.id}`);
    }
  }
}
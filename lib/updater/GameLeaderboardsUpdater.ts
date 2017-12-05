/*
 * Download the Leaderboard Data and the data from 1 day, 3 days, 1 week, 1 month, 6 months, 1 year ago
 * 
 * compare the data and save pos and data changes in properties for each of these dates
 */

import { GameType, Leaderboard, LeaderboardPlace } from "hive-api";
import { Updater } from "./Updater";
import { Config } from "../config/Config";
import { database, firestore } from "firebase-admin";
import { CollectionReference, DocumentReference, QuerySnapshot } from "@google-cloud/firestore";

export class GameLeaderboardUpdater extends Updater {
  private _interval: number;
  private _dataRef: CollectionReference;
  private _ref: CollectionReference;

  constructor(db: firestore.Firestore, private readonly gameType: GameType) {
    super();
    this._ref = db.collection("gameLeaderboards");

    this._dataRef = this._ref.doc(gameType.id).collection("dates");

    this._interval = 1000 * 60 * 60 * 24;
  }

  private getDateRefForDate(dateOrUtcYear: Date): DocumentReference;
  private getDateRefForDate(dateOrUtcYear: number, utcMonth: number, utcDate: number): DocumentReference;
  private getDateRefForDate(dateOrUtcYear: Date | number, utcMonth?: number, utcDate?: number): DocumentReference{
    if(typeof dateOrUtcYear === 'number'){
      return this.getDateRefForDate(new Date(Date.UTC(dateOrUtcYear, utcMonth, utcDate)))      
    }else{
      return this._dataRef.doc(dateOrUtcYear.toISOString().substr(0,10)) // ISO Date (without time)
    }
  }

  private getDateRefData(utcYear: number, utcMonth: number, utcDate: number){
    return this.getDateRefForDate(utcYear, utcMonth, utcDate)
      .collection("pages")
      .get()
      .then((snap: QuerySnapshot) => 
        snap.docs
          // load data
          .map(doc => doc.data().data)
           // save data to map with uuids as key and undo the pagination
          .reduce((map, doc) => doc.reduce((map, ele) => map.set(ele.uuid, ele), map), new Map())
      )
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

      const leaderboardPlaces: Map<number, LeaderboardPlace> = await leaderboard.load(0, (await Config.get('game_leaderboard_size') || 1000));

      const date = new Date("2017-12-06");

      // negative days or month are working and calculated correctly
      const oldLeaderboardData = [
        { interval: "day",     data: await this.getDateRefData(date.getFullYear(),     date.getMonth(),     date.getDate() - 1)},
        { interval: "3days",   data: await this.getDateRefData(date.getFullYear(),     date.getMonth(),     date.getDate() - 3)},
        { interval: "week",    data: await this.getDateRefData(date.getFullYear(),     date.getMonth(),     date.getDate() - 7)},
        { interval: "month",   data: await this.getDateRefData(date.getFullYear(),     date.getMonth() - 1, date.getDate()    )},
        { interval: "6months", data: await this.getDateRefData(date.getFullYear(),     date.getMonth() - 6, date.getDate()    )},
        { interval: "year",    data: await this.getDateRefData(date.getFullYear() - 1, date.getMonth(),     date.getDate()    )}
      ];

      // convert data
      const convData = [... leaderboardPlaces.values()].map((place: LeaderboardPlace) => {
        let res: any = {};

        res.uuid = place.player.uuid;
        res.name = place.player.name;
        res.place = place.place;
        res.raw = GameLeaderboardUpdater.removeUnimportantRaw(place.raw);
        
        // save the changes for the old data for every player that has data from the date
        oldLeaderboardData
        .filter(({data: oldData}) => oldData && oldData.has(place.player.uuid))
        .forEach(({interval: interval, data: oldData}) => {
          const oldPlayerData = oldData.get(place.player.uuid);

          res[interval] = {
            place: place.place - oldPlayerData.place,
            raw: Object.keys(oldPlayerData.raw)
              // calc values for each key
              .map(key => [key, place.raw[key] - oldPlayerData.raw[key]])
              // put them together into one object
              .reduce((obj, [key, val]) => {obj[key] = val; return obj}, {} )
          }
        });

        return res;
      });

      const pageCol = this.getDateRefForDate(date.getFullYear(), date.getMonth(), date.getDate())
        .collection("pages");

      // paginate data in pages of 100 entries
      GameLeaderboardUpdater.paginate(convData, 100)
      // save pages to firestore
      .forEach((page,index) => {
        pageCol.doc((index * 100).toString()).create({data: page});
      });
    } catch (err) {
      Updater.sendError(err, `leaderboard/${this.gameType.id}`);
    }
  }

  private static paginate<T>(arr: T[], pageSize: number): T[][] {
    return arr.reduce((paginated, data, index) => {
      if (index % pageSize === 0) {
        paginated.push([]);
      }

      paginated[Math.floor(index / pageSize) || 0].push(data);

      return paginated;
    }, []);
  }
}
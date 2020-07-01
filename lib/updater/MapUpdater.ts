import { Player, Server, GameTypes, GameMap, GameType } from "hive-api";
import { database } from "firebase-admin";
import { Stats } from "../Stats";
import { setTimeout } from "timers";
import { notificationSender } from "../main";
import { NotificationTypes } from "../notifications/NotificationTypes";
import { BasicUpdater, Updater } from "lergins-bot-framework";

export class MapUpdater extends BasicUpdater {
  private oldData: Map<String, string[]> = new Map();
  private _dataRef: database.Reference;
  private _oldDataRef: database.Reference;
  private _ref: database.Reference;

  get id() { return `maps`; }

  constructor() {
    super();
    
    this._ref = database().ref("maps");
    this._dataRef = this._ref.child("data");
    this._oldDataRef = this._ref.child("oldData");
  }

  async init() {
    await this.initUpdateInfo();

    super.init();
  }

  async initUpdateInfo() {
    await Promise.all( [
        GameTypes.BP,
        GameTypes.DR,
        GameTypes.HIDE,
        GameTypes.SP,
        GameTypes.TIMV,
        GameTypes.SKY,
        GameTypes.DRAW,
        GameTypes.GRAV,
        GameTypes.BED,
      ].map(type => this.initUpdateInfoType(type)));
  }

  async initUpdateInfoType(type: GameType){
    try {
      let maps = await type.maps();

      return Promise.all(maps.map(async map => this.addToList(map)));
    } catch (err) {
      if (err.name === "FetchError") {
        return new Promise((resolve, reject) => {
          Stats.track('fetch-error-maps');

          setTimeout(() => {
            resolve(this.initUpdateInfoType(type));
          }, 60000);
        });
      } else {
        Updater.sendError(err, `${type.id}/maps`);
      }
    }
  }

  async updateInfoType(type: GameType){
    try {
      Stats.track('map-update-gametype');

      let maps = await type.maps(this.interval);

      maps.filter(map => !this.oldData.has(type.id) || this.oldData.get(type.id).indexOf(map.worldName.toLowerCase()) === -1)
        .forEach(async map => this.addToList(map).catch(err => console.error(err + map.worldName)));
    } catch (err) {
      if (err.name === "FetchError") {
        return new Promise((resolve, reject) => {
          Stats.track('fetch-error-maps');

          setTimeout(() => {
            resolve(this.updateInfoType(type));
          }, 60000);
        });
      } else {
        Updater.sendError(err, `${type.id}/maps`);
      }
    }
  }

  async updateInfo() {
     [
       GameTypes.BP,
       GameTypes.DR,
       GameTypes.HIDE,
       GameTypes.SP,
       GameTypes.TIMV,
       GameTypes.SKY,
       GameTypes.DRAW,
       GameTypes.GRAV,
       GameTypes.BED,
     ].forEach(async (type) => this.updateInfoType(type));
  }

  async addToList(map: GameMap) {
    this._dataRef.child(map.worldName).once('value' , snap => {
      let currentData = snap.val();

      if(currentData === null){
        notificationSender().send(NotificationTypes.NEW_MAP, map);

        return this._dataRef.child(map.worldName).set({
          date: new Date().getTime(),
          sortdate: 10000000000000 - new Date().getTime(),
          gameType: map.gameType.id,
          mapName: map.mapName || map.worldName,
          worldName: map.worldName,
          author: map.author || ""
        })
      }else{
        if(
          map.mapName && currentData.mapName !== map.mapName
          || map.author && currentData.author !== map.author
        ){
          currentData.mapName = map.mapName || map.worldName;
          currentData.author = map.author || "";
          return this._dataRef.child(map.worldName).update(currentData);
        }      
      }
    }).catch((res) => {
      throw new Error(res);
    });

    this._oldDataRef.child(map.gameType.id).child(map.worldName).set(true).catch((res) => {throw new Error(res);});
    if(this.oldData.has(map.gameType.id)){
      this.oldData.get(map.gameType.id).push(map.worldName.toLowerCase());
    }else{
      this.oldData.set(map.gameType.id, [map.worldName.toLowerCase()]);
    }
  }
}
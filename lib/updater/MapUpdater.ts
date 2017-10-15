import { Player, Server, GameTypes, GameMap } from "hive-api";
import { Updater } from "./Updater"
import { NotificationSender } from "../notifications/NotificationSender"

export class MapUpdater extends Updater {
  private _interval: number;
  private oldData: Map<String, string[]> = new Map();
  private _dataRef: admin.database.Reference;
  private _oldDataRef: admin.database.Reference;

  constructor(db: admin.database.Database) {
    super(db.ref("maps"));

    this._dataRef = this._ref.child("data");
    this._oldDataRef = this._ref.child("oldData");

    this._interval = 1000 * 60 * 10;
  }

  async start() {
    await this.initUpdateInfo();

    setInterval(() => this.updateInfo(), this._interval);

    return null;
  }

  async initUpdateInfo() {
    await GameTypes.list.forEach(async type => {
      try{
        let maps = await type.maps();

        await Promise.all(maps.map(async map => this.addToList(map)));
      }catch(err) {
        Updater.sendError(err, `${type.id}/maps`);
      }
    });
  }

  async updateInfo() {
    GameTypes.list.forEach(async type => {
      try {
        let maps = await type.maps(this._interval);

        maps.filter(map => !this.oldData.has(type.id) || this.oldData.get(type.id).indexOf(map.worldName.toLowerCase()) === -1)
          .forEach(async map => this.addToList(map).catch(err => console.error(err + map.worldName)));
      }catch(err){
        Updater.sendError(err, `${type.id}/maps`);
      }
    });
  }

  async addToList(map: GameMap) {
    this._dataRef.child(map.worldName).once('value' , snap => {
      let currentData = snap.val();

      if(currentData === null){
        NotificationSender.sendNewMap(map);

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
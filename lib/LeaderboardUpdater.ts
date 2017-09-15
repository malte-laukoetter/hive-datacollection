import * as admin from "firebase-admin"
import {Player} from "hive-api";
import {Updater} from "./Updater";

export abstract class LeaderboardUpdater extends Updater{
    protected _property: string;
    protected _limit: number;
    protected _intervalAll: number;
    protected _intervalUpdate: number;
    protected _newPlayerRef: admin.database.Reference;
    protected _dataRef: admin.database.Reference;

    protected _waitingPlayers: Set<Player> = new Set();

    constructor(ref: admin.database.Reference, property: string, limit: number, intervalAll: number,
                intervalUpdate: number){
        super(ref);
        this._property = property;
        this._limit = limit;
        this._intervalAll = intervalAll;
        this._intervalUpdate = intervalUpdate;
        this._newPlayerRef = this._ref.child("newPlayers");
        this._dataRef = this._ref.child("data");
    }

    async start(){
        this._newPlayerRef.on("child_added", snap => {
            let player: Player = new Player(snap.key);

            this.updateInfo(player).then(()=>{
                this._newPlayerRef.child(snap.key).remove();
                return;
            }).catch((err)=>console.error(`error while adding ${snap.key}: ${err.message}`));
        });

        this._dataRef.orderByChild(this._property).limitToLast(this._limit).on("child_added", snap => {
            let player: Player = new Player(snap.key);

            this._waitingPlayers.add(player);
        });

        setInterval(()=>{
            let a = this._waitingPlayers.values().next();

            if(!a.done){
                this._waitingPlayers.delete(a.value);

                this.updateInfo(a.value).then(() => {
                    setTimeout(()=>{
                        this._waitingPlayers.add(a.value);
                        return;
                    }, this._intervalUpdate);
                }).catch((err: Error) => {
                    setTimeout(()=>{
                        this._waitingPlayers.add(a.value);
                        return;
                    }, this._intervalUpdate);

                    if (err.name === "FetchError"){
                        console.error(`Error Response from Hive: ${a.value.uuid}`)
                    }else {
                        console.error(`error while updating ${a.value.uuid}: ${err.message}`)
                    }
                });
            }
        }, this._intervalAll);
    }

    abstract async updateInfo(player: Player);
}
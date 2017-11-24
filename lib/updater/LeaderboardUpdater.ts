import * as admin from "firebase-admin"
import {Player} from "hive-api";
import {Updater} from "./Updater";
import { UpdateService } from "./UpdateService";

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
        this._newPlayerRef.on("child_added", async snap => {
            let player: Player = new Player(snap.key);

            await UpdateService.requestPlayerInfoUpdate(player, 1000*60*60*24*30);

            this.requestUpdate(player).then(()=>{
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

                this.requestUpdate(a.value).then(() => {
                    setTimeout(()=>{
                        this._waitingPlayers.add(a.value);
                        return;
                    }, this._intervalUpdate);
                }).catch((err: Error) => {
                    setTimeout(()=>{
                        this._waitingPlayers.add(a.value);
                        return;
                    }, this._intervalUpdate);

                    Updater.sendError(err, a.value.uuid);
                });
            }
        }, this._intervalAll);
    }

    abstract async requestUpdate(player: Player);
}
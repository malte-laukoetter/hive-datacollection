import { Player, PlayerInfo } from "hive-api";
import { Updater } from "./Updater";
import { UpdateService } from "./UpdateService";
import { database } from "firebase-admin";

export abstract class LeaderboardUpdater extends Updater{
    protected _property: string;
    protected _limit: number;
    protected _intervalAll: number;
    protected _newPlayerRef: database.Reference;
    protected _dataRef: database.Reference;
    protected _ref: database.Reference;

    protected _waitingPlayers: Set<Player> = new Set();

    constructor(ref: database.Reference, property: string, limit: number, intervalAll: number){
        super();
        this._ref = ref;
        this._property = property;
        this._limit = limit;
        this._intervalAll = intervalAll;
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
                    }, this.interval);
                }).catch((err: Error) => {
                    setTimeout(()=>{
                        this._waitingPlayers.add(a.value);
                        return;
                    }, this.interval);

                    Updater.sendError(err, a.value.uuid);
                });
            }
        }, this._intervalAll);
    }

    abstract async requestUpdate(player: Player);
}

export abstract class PlayerInfoLeaderboardUpdater extends LeaderboardUpdater {
    protected abstract update(info: PlayerInfo);

    constructor(ref: database.Reference, property: string, limit: number = 100, intervalAll: number = 10*1000){
        super(ref, property, limit, intervalAll);

        UpdateService.registerPlayerInfoUpdater(info => this.update(info), this.id);
    }

    async requestUpdate(player: Player): Promise<any> {
        return UpdateService.requestPlayerInfoUpdate(player, this.interval);
    }
}

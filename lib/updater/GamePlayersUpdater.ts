import { GameType, GameTypes } from "hive-api";
import { CountUpdater } from "./CountUpdater";
import { database } from "firebase-admin";


export class GamePlayersUpdater extends CountUpdater{
    private _currRef: database.Reference;
    readonly id = `players_gametypes`;

    constructor(db: database.Database) {
        super(db.ref("gamemodeStats"));

        this._currRef = this._ref.child('curr');
    }

    async updateInfo(){
        return Promise.all(GameTypes.list.map(async (gameType: GameType) => {
            let players: number = await gameType.uniquePlayers(this.interval);

            this.sendNotification(players, gameType);

            this._currRef.child(gameType.id).set(players);

            return this._ref.child(gameType.id).child(new Date().getTime().toString()).set(players);
        }));
    }
}
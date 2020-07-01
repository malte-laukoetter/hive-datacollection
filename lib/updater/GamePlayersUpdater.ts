import { GameType, GameTypes } from "hive-api";
import { CountUpdater } from "./CountUpdater";
import { database } from "firebase-admin";


export class GamePlayersUpdater extends CountUpdater{
    private _currRef: database.Reference;
    get id() { return `players_gametypes`; }

    constructor() {
        super(database().ref("gamemodeStats"));

        this._currRef = this._ref.child('curr');
    }

    async updateInfo(){
        return Promise.all( [
        GameTypes.BP,
        GameTypes.DR,
        GameTypes.HIDE,
        GameTypes.SP,
        GameTypes.TIMV,
        GameTypes.SKY,
        GameTypes.DRAW,
        GameTypes.GRAV,
        GameTypes.BED,
      ].map(async (gameType: GameType) => {
            let players: number = await gameType.uniquePlayers(this.interval);

            this.sendNotification(players, gameType);

            this._currRef.child(gameType.id).set(players);

            return this._ref.child(gameType.id).child(new Date().getTime().toString()).set(players);
        }));
    }
}
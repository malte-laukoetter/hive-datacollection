import { GameType, GameTypes } from "hive-api";
import { CountUpdater } from "./CountUpdater";


export class GamePlayersUpdater extends CountUpdater{
    private _interval: number;
    private _currRef: admin.database.Reference;

    constructor(db: admin.database.Database) {
        super(db.ref("gamemodeStats"));

        this._currRef = this._ref.child('curr');

        this._interval = 1000 * 60 * 60;
    }

    async start(): Promise<any> {
        this.updateInfo();

        setInterval(() => this.updateInfo(), this._interval);

        return null;
    }

    async updateInfo(){
        return Promise.all(GameTypes.list.map(async (gameType: GameType) => {
            let players: number = await gameType.uniquePlayers(60*60*1000);

            this.sendNotification(players, gameType);

            this._currRef.child(gameType.id).set(players);

            return this._ref.child(gameType.id).child(new Date().getTime().toString()).set(players);
        }));
    }
}
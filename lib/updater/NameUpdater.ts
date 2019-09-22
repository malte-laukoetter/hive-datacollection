import { Player } from "hive-api"
import { Updater } from 'lergins-bot-framework'
import { UpdateService } from "./UpdateService"
import { database } from "firebase-admin";

export class NameUpdater extends Updater {
    _ref: database.Reference;
    get id() { return `names`; }

    constructor() {
        super();
    }

    start() {
        this._ref = database().ref("names");
        UpdateService.registerPlayerInfoUpdater(
            (info, player) => this.update(player),
            this.id
        );
    }

    public update(uuid: string, name: string)
    public update(player: Player)
    public update(uuid: string | Player, name?: string) {
        if (typeof uuid !== 'string') {
            name = uuid.name
            uuid = uuid.uuid
        }

        if (this._ref) {
            this._ref.child(uuid).set(name);
        }
    }
}

export const nameUpdater = new NameUpdater()

import {Updater} from "./Updater"
import { DiscordWebhook } from "./discordWebhook"
import {Player, Server} from "hive-api";

export enum ChangeType{
    MODERATOR_ADD = "MODERATOR_ADD",
    MODERATOR_REMOVE = "MODERATOR_REMOVE",
    SENIOR_MODERATOR_ADD = "SENIOR_MODERATOR_ADD",
    SENIOR_MODERATOR_REMOVE = "SENIOR_MODERATOR_REMOVE",
    DEVELOPER_ADD = "DEVELOPER_ADD",
    DEVELOPER_REMOVE = "DEVELOPER_REMOVE",
    OWNER_ADD = "OWNER_ADD",
    OWNER_REMOVE = "OWNER_REMOVE"
}

export class TeamUpdater extends Updater {
    private _interval: number;
    private _dataRef: admin.database.Reference;
    private _oldDataRef: admin.database.Reference;

    constructor(db: admin.database.Database) {
        super(db.ref("teamChanges"));

        this._dataRef = this._ref.child("data");
        this._oldDataRef = this._ref.child("oldData");

        this._interval = 1000 * 60 * 10;
    }

    async start() {
        this.updateInfo();

        setInterval(() => this.updateInfo(), this._interval);

        return null;
    }

    async updateInfo(){
        let owners = await Server.owners(1000*60*10);
        let developers = await Server.developers(1000*60*10);
        let seniorModerators = await Server.seniorModerators(1000*60*10);
        let moderators = await Server.moderators(1000*60*10);

        this._oldDataRef.once("value", snap => {
            let data = snap.val();

            if(!data) return;

            let oldOwners: string[] = data.owners;
            let oldDevelopers: string[] = data.developers;
            let oldSeniorModerators: string[] = data.seniorModerators;
            let oldModerators: string[] = data.moderators;

            owners.filter(player => oldOwners.indexOf(player.uuid) === -1)
                .forEach(async player => this.addToChangeList(player, ChangeType.OWNER_ADD));

            developers.filter(player => oldDevelopers.indexOf(player.uuid) === -1)
                .forEach(async player => this.addToChangeList(player, ChangeType.DEVELOPER_ADD));

            seniorModerators.filter(player => oldSeniorModerators.indexOf(player.uuid) === -1)
                .forEach(async player => this.addToChangeList(player, ChangeType.SENIOR_MODERATOR_ADD));

            moderators.filter(player => oldModerators.indexOf(player.uuid) === -1)
                .forEach(async player => this.addToChangeList(player, ChangeType.MODERATOR_ADD));

            let ownersUuids = owners.map(player => player.uuid);
            oldOwners.filter(uuid => ownersUuids.indexOf(uuid) === -1)
                .forEach(async uuid => this.addToChangeList(new Player(uuid), ChangeType.OWNER_REMOVE));

            let developersUuids = developers.map(player => player.uuid);
            oldDevelopers.filter(uuid =>
                developersUuids.indexOf(uuid) === -1 &&
                ownersUuids.indexOf(uuid) === -1
            ).forEach(async uuid => this.addToChangeList(new Player(uuid), ChangeType.DEVELOPER_REMOVE));

            let seniorModeratorsUuids = seniorModerators.map(player => player.uuid);
            oldSeniorModerators.filter(uuid =>
                seniorModeratorsUuids.indexOf(uuid) === -1 &&
                developersUuids.indexOf(uuid) === -1 &&
                ownersUuids.indexOf(uuid) === -1
            ).forEach(async uuid => this.addToChangeList(new Player(uuid), ChangeType.SENIOR_MODERATOR_REMOVE));

            let moderatorsUuids = moderators.map(player => player.uuid);
            oldModerators.filter(uuid =>
                moderatorsUuids.indexOf(uuid) === -1 &&
                seniorModeratorsUuids.indexOf(uuid) === -1 &&
                developersUuids.indexOf(uuid) === -1 &&
                ownersUuids.indexOf(uuid) === -1
            ).forEach(async uuid => this.addToChangeList(new Player(uuid), ChangeType.MODERATOR_REMOVE));

            this._oldDataRef.set({
                "owners": owners.map(player => player.uuid),
                "developers": developers.map(player => player.uuid),
                "seniorModerators": seniorModerators.map(player => player.uuid),
                "moderators": moderators.map(player => player.uuid)
            })
        })
    }

    async addToChangeList(player: Player, type: ChangeType){
        await player.info();

        this._dataRef.push().set({
            date: new Date().getTime(),
            name: player.name,
            uuid: player.uuid,
            type: type
        });

        DiscordWebhook.instance.sendTeamChange(player, type);
    }
}
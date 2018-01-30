import { Player, Server, Ranks } from "hive-api";
import { Updater } from "./Updater"
import { NotificationSender } from "../notifications/NotificationSender"
import { database } from "firebase-admin";
import { BasicUpdater } from "./BasicUpdater";

export enum ChangeType{
    MODERATOR_ADD = "MODERATOR_ADD",
    MODERATOR_REMOVE = "MODERATOR_REMOVE",
    SENIOR_MODERATOR_ADD = "SENIOR_MODERATOR_ADD",
    SENIOR_MODERATOR_REMOVE = "SENIOR_MODERATOR_REMOVE",
    DEVELOPER_ADD = "DEVELOPER_ADD",
    DEVELOPER_REMOVE = "DEVELOPER_REMOVE",
    OWNER_ADD = "OWNER_ADD",
    OWNER_REMOVE = "OWNER_REMOVE",
    NECTAR_ADD = "NECTAR_ADD",
    NECTAR_REMOVE = "NECTAR_REMOVE"
}

export class TeamUpdater extends BasicUpdater {
    private _dataRef: database.Reference;
    private _oldDataRef: database.Reference;
    private _ref: database.Reference;

    readonly id = `team`

    constructor(db: database.Database) {
        super();

        this._ref = db.ref("teamChanges");
        this._dataRef = this._ref.child("data");
        this._oldDataRef = this._ref.child("oldData");
    }

    async updateInfo(){
        try {
            let owners = await Ranks.OWNER.listPlayers(this.interval);
            let developers = await Ranks.DEVELOPER.listPlayers(this.interval);
            let seniorModerators = await Ranks.SRMODERATOR.listPlayers(this.interval);
            let moderators = await Ranks.MODERATOR.listPlayers(this.interval);
            let nectar = await Ranks.NECTAR.listPlayers(this.interval);

            this._oldDataRef.once("value", snap => {
                let data = snap.val();

                if(!data) return;

                let oldOwners: string[] = data.owners || [];
                let oldDevelopers: string[] = data.developers || [];
                let oldSeniorModerators: string[] = data.seniorModerators || [];
                let oldModerators: string[] = data.moderators || [];
                let oldNectar: string[] = data.nectar || [];

                owners.filter(player => oldOwners.indexOf(player.uuid) === -1)
                    .forEach(async player => this.addToChangeList(player, ChangeType.OWNER_ADD));

                developers.filter(player => oldDevelopers.indexOf(player.uuid) === -1)
                    .forEach(async player => this.addToChangeList(player, ChangeType.DEVELOPER_ADD));

                seniorModerators.filter(player => oldSeniorModerators.indexOf(player.uuid) === -1)
                    .forEach(async player => this.addToChangeList(player, ChangeType.SENIOR_MODERATOR_ADD));

                moderators.filter(player => oldModerators.indexOf(player.uuid) === -1)
                    .forEach(async player => this.addToChangeList(player, ChangeType.MODERATOR_ADD));

                nectar.filter(player => oldNectar.indexOf(player.uuid) === -1)
                    .forEach(async player => this.addToChangeList(player, ChangeType.NECTAR_ADD));

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
               
                let nectarUuids = nectar.map(player => player.uuid);
                oldNectar.filter(uuid =>
                    nectarUuids.indexOf(uuid) === -1
                ).forEach(async uuid => this.addToChangeList(new Player(uuid), ChangeType.NECTAR_REMOVE));

                this._oldDataRef.set({
                    "owners": owners.map(player => player.uuid),
                    "developers": developers.map(player => player.uuid),
                    "seniorModerators": seniorModerators.map(player => player.uuid),
                    "moderators": moderators.map(player => player.uuid),
                    "nectar": nectar.map(player => player.uuid)
                });
            })
        }catch(err){
            Updater.sendError(err, 'team');
        }
    }

    async addToChangeList(player: Player, type: ChangeType){
        await player.info();

        this._dataRef.push().set({
            date: new Date().getTime(),
            name: player.name,
            uuid: player.uuid,
            type: type
        });

        NotificationSender.sendTeamChange(player, type);
    }
}
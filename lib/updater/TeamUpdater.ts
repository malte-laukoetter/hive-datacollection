import { Player, Server, Ranks } from "hive-api";
import { database } from "firebase-admin";
import { notificationSender, config } from "../main";
import { NotificationTypes } from "../notifications/NotificationTypes";
import { BasicUpdater, Updater } from "lergins-bot-framework";

export enum ChangeType {
    MODERATOR_ADD = "MODERATOR_ADD",
    MODERATOR_REMOVE = "MODERATOR_REMOVE",
    SENIOR_MODERATOR_ADD = "SENIOR_MODERATOR_ADD",
    SENIOR_MODERATOR_REMOVE = "SENIOR_MODERATOR_REMOVE",
    DEVELOPER_ADD = "DEVELOPER_ADD",
    DEVELOPER_REMOVE = "DEVELOPER_REMOVE",
    OWNER_ADD = "OWNER_ADD",
    OWNER_REMOVE = "OWNER_REMOVE",
}


type TeamChangeEntry = {
    date: number,
    name: string,
    uuid: string,
    type: ChangeType
}

export class TeamUpdater extends BasicUpdater {
    private _dataRef: database.Reference;
    private _oldDataRef: database.Reference;
    private _ref: database.Reference;
    private _unpublishedChanges: database.Reference;
    private _neverPublishedChanges: database.Reference;

    get id() { return `team`; }

    constructor() {
        super();

        this._ref = database().ref("teamChanges");
        this._dataRef = this._ref.child("data");
        this._oldDataRef = this._ref.child("oldData");
        this._unpublishedChanges = this._ref.child("unpublishedChanges");
        this._neverPublishedChanges = this._ref.child("neverPublishedChanges");
    }

    private async isChangeOldEnoughToPublish(change: TeamChangeEntry) {
        const earliestPostTime = new Date().getTime() - await config().get('min_age_of_teamchange')
        return change.date < earliestPostTime
    }

    private async sendTeamChange(change: TeamChangeEntry) {
        const player = new Player(change.uuid)
        player.name = change.name

        this._dataRef.push().set(change);
        notificationSender().send(NotificationTypes.TEAM_CHANGE, { player: player, type: change.type });
    }

    async updateInfo(){
        try {
            let owners = await Ranks.OWNER.listPlayers(this.interval);
            let developers = await Ranks.DEVELOPER.listPlayers(this.interval);
            let seniorModerators = await Ranks.SRMODERATOR.listPlayers(this.interval);
            let moderators = await Ranks.MODERATOR.listPlayers(this.interval);

            this._oldDataRef.once("value", async snap => {
                let data = snap.val();

                if(!data) return;

                let oldOwners: string[] = data.owners || [];
                let oldDevelopers: string[] = data.developers || [];
                let oldSeniorModerators: string[] = data.seniorModerators || [];
                let oldModerators: string[] = data.moderators || [];

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
                    "moderators": moderators.map(player => player.uuid),
                });

                const unpublishedChanges: { [key: string]: TeamChangeEntry } = (await this._unpublishedChanges.once('value')).val()

                for(let [key, change] of Object.entries(unpublishedChanges)) {
                    if (await this.isChangeOldEnoughToPublish(change)) {
                        let changeStillActive = false

                        switch(change.type) {
                            case ChangeType.MODERATOR_ADD:
                                changeStillActive = moderatorsUuids.indexOf(change.uuid) !== -1
                                break;
                            case ChangeType.MODERATOR_REMOVE:
                                changeStillActive = moderatorsUuids.indexOf(change.uuid) === -1
                                break;
                            case ChangeType.SENIOR_MODERATOR_ADD:
                                changeStillActive = seniorModeratorsUuids.indexOf(change.uuid) !== -1
                                break;
                            case ChangeType.SENIOR_MODERATOR_REMOVE:
                                changeStillActive = seniorModeratorsUuids.indexOf(change.uuid) === -1
                                break;
                            case ChangeType.DEVELOPER_ADD:
                                changeStillActive = developersUuids.indexOf(change.uuid) !== -1
                                break;
                            case ChangeType.DEVELOPER_REMOVE:
                                changeStillActive = developersUuids.indexOf(change.uuid) === -1
                                break;
                            case ChangeType.OWNER_ADD:
                                changeStillActive = ownersUuids.indexOf(change.uuid) !== -1
                                break;
                            case ChangeType.OWNER_REMOVE:
                                changeStillActive = ownersUuids.indexOf(change.uuid) === -1
                                break;
                        }

                        if (changeStillActive) {
                            this.sendTeamChange(change)
                        } else {
                            this._neverPublishedChanges.child(key).set(change)
                        }

                        this._unpublishedChanges.child(key).remove()
                    }
                }
            })
        }catch(err){
            Updater.sendError(err, 'team');
        }
    }

    async addToChangeList(player: Player, type: ChangeType) {
        await player.info();

        // no team change notifications for clankstars test account
        if(player.uuid === '0b7f57840bb44fcf9748b66d61feef29') return;

        const changeEntry: TeamChangeEntry = {
            date: new Date().getTime(),
            name: player.name,
            uuid: player.uuid,
            type: type
        }

        this._unpublishedChanges.push().set(changeEntry);
    }
}
import { Player, PlayerInfo } from "hive-api"
import { PlayerInfoLeaderboardUpdater } from "./LeaderboardUpdater"
import { UpdateService } from "./UpdateService";
import { database } from "firebase-admin";

export class MedalUpdater extends PlayerInfoLeaderboardUpdater {
    get id(){ return `leaderboard_medals`; }

    constructor() {
        super(database().ref("medalLeaderboard"), "medals", 200);
    }

    update(info: PlayerInfo){
        this._dataRef.child(info.uuid).update({
            medals: info.medals,
            name: info.name
        });
    }
}

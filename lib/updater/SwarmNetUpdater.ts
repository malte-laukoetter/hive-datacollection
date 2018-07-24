import { GameTypes, GameType, Player, Achievement, PlayerGameInfo, PlayerInfo, PlayerGameInfoAchievements, TheSwarmAchievement } from "hive-api"
import { UpdateService } from "./UpdateService";
import { database } from "firebase-admin";
import { Updater } from "lergins-bot-framework";

export class SwarmNetUpdater extends Updater {
    private _ref: database.Reference;

    get id() { return `swarm_updater`; }

    constructor() {
        super()

        this._ref = database().ref("swarm");


        UpdateService.registerPlayerInfoUpdater(
            (info, player) => this.update(info, player),
            this.id
        );
    }

    async start(){}

    private async update(playerInfo: PlayerInfo, player: Player){
        let achievement = playerInfo.achievements.find(a => a.id === 'THESWARM')

        if (achievement && achievement instanceof TheSwarmAchievement){
          let game = achievement.theSwarmGame;

          this._ref.child(player.uuid).set({
            from: achievement.theSwarmFrom.uuid,
            game: game ? game.id : null,
            name: playerInfo.name
          }).catch(err => console.log(err))
        }
    }
}


import * as request from "request"
import { GameMap, Player } from "hive-api";
import { ChangeType } from "./team";

const config = require("../config.json");
// the a can be any letter but there must be at least 1 letter
const hiveEmoji = `<:a:${config.discord.hiveEmojiId}>`

export class DiscordWebhook {
  private static _instance;

  static get instance(): DiscordWebhook{
    return DiscordWebhook._instance;
  }

  constructor(readonly id: string, readonly key: string){
    DiscordWebhook._instance = this;
  }

  send(message){
    request.post({
      url: `https://discordapp.com/api/webhooks/${this.id}/${this.key}`,
      headers: {
        "User-Agent": "hive-notification-bot (https://hive.lergin.de, v0.1)",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        content: message
      })
    });
  }

  sendNewMap(map: GameMap){
    this.send(`${hiveEmoji} **New ${map.gameType.name} Map** ${hiveEmoji}\n${map.mapName} by ${map.author}`);
  }

  sendTeamChange(player: Player, type: ChangeType){
    let title = "";
    let body = "";

    switch (type) {
      case ChangeType.MODERATOR_ADD:
        title = 'New Moderator';
        body = `${player.name} is now a Moderator!`;
        break;
      case ChangeType.MODERATOR_REMOVE:
        title = 'A Moderator left the Team';
        body = `${player.name} is no longer a Moderator`;
        break;
      case ChangeType.SENIOR_MODERATOR_ADD:
        title = 'New Senior Moderator';
        body = `${player.name} is now a Senior Moderator!`;
        break;
      case ChangeType.SENIOR_MODERATOR_REMOVE:
        title = 'A Senior Moderator left the Team';
        body = `${player.name} is no longer a Senior Moderator`;
        break;
      case ChangeType.DEVELOPER_ADD:
        title = 'New Developer';
        body = `${player.name} is now a Developer!`;
        break;
      case ChangeType.DEVELOPER_REMOVE:
        title = 'A Developer left the Team';
        body = `${player.name} is no longer a Developer`;
        break;
      case ChangeType.OWNER_ADD:
        title = 'New Owner';
        body = `${player.name} is now an Owner!`;
        break;
      case ChangeType.OWNER_REMOVE:
        title = 'An Owner left the Hive';
        body = `${player.name} is no longer an Owner!`;
        break;
      default:
        title = 'Something changed in the team of the Hive';
        body = `${player.name} is now something else but we don't know what...`;
        break;
    }

    this.send(`${hiveEmoji} **${title}** ${hiveEmoji}\n${body}`);
  }
}
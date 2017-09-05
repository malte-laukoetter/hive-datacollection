import { GameMap, Player, GameTypes } from "hive-api";
import { ChangeType } from "./team";
import { WebhookClient, RichEmbed } from "discord.js";

const config = require("../config.json");
const hiveEmoji = `<:hive:${config.discord.hiveEmojiId}>`

const sendWorldNameGameTypes = [GameTypes.BED.id, GameTypes.SKY.id, GameTypes.GNT.id]

export class DiscordWebhook {
  private static _instance;
  private _doSendTeamChange: boolean = true;
  private _doSendNewMaps: boolean = true;
  private hook;

  set doSendTeamChange(send: boolean){
    this._doSendTeamChange = send;
  }

  get doSendTeamChange(){
    return this._doSendTeamChange;
  }

  set doSendNewMaps(send: boolean){
    this._doSendNewMaps = send;
  }

  get doSendNewMaps(){
    return this._doSendNewMaps;
  }

  static get instance(): DiscordWebhook{
    return DiscordWebhook._instance;
  }

  constructor(id: string, key: string){
    DiscordWebhook._instance = this;
    this.hook = new WebhookClient(id, key);
  }

  send(message){
    this.hook.send(message);
  }

  sendNewMap(map: GameMap){
    if(!this.doSendNewMaps) return;

    const embed = new RichEmbed();
    embed.setURL("https://hive.lergin.de/maps");
    embed.setTitle(`${hiveEmoji} New ${map.gameType.name} Map ${hiveEmoji}`);
    embed.addField("Game", map.gameType.name, true);
    if (sendWorldNameGameTypes.indexOf(map.gameType.id) === -1){
      embed.addField("Map", (map.mapName || map.worldName), true);
    }else{
      embed.addField("Map", `${map.mapName} (${map.worldName})`, true);
    }
    embed.addField("Created by", `*${map.author}*`, true);
    embed.setFooter(`The map was just added to the API, there may be a delay before you can play it on the server`);

    this.send(embed);
  }

  sendTeamChange(player: Player, type: ChangeType){
    if (!this.doSendTeamChange) return;

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
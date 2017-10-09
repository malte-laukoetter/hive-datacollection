import { GameMap, Player, GameTypes, GameType } from "hive-api";
import { ChangeType } from "./team";
import { WebhookClient, RichEmbed } from "discord.js";

const sendWorldNameGameTypes = [GameTypes.BED.id, GameTypes.SKY.id, GameTypes.GNT.id]

export class NotificationSender {
  private static _instance: NotificationSender = new NotificationSender();
  private subscriptions: Set<NotificationSubscriber> = new Set();

  constructor(){}
  
  static get instance(): NotificationSender {
    return NotificationSender._instance;
  }

  register(subscriber: NotificationSubscriber){
    this.subscriptions.add(subscriber);
  }

  sendCount(type, count: Number){
    this.subscriptions.forEach(sub => sub.sendCount(type, count))
  }

  send(message){
    this.subscriptions.forEach(sub => sub.send(message));
  }

  sendNewMap(map: GameMap) {
    this.subscriptions.forEach(sub => sub.sendNewMap(map));
  }

  sendTeamChange(player: Player, type: ChangeType) {
    this.subscriptions.forEach(sub => sub.sendTeamChange(player, type));
  }
}

export interface NotificationSubscriber {
  send(message);
  sendNewMap(map: GameMap);
  sendTeamChange(player: Player, type: ChangeType);
  sendCount(type, count: Number);
}

export class DiscordWebhook extends WebhookClient implements NotificationSubscriber {
  private _doSendTeamChange: boolean = true;
  private _doSendNewMaps: boolean = true;
  private _mapGameTypes: String[] = [];
  hiveEmojiId: String = ''

  private get hiveEmoji(): String{
    return this.hiveEmojiId.length > 2 ? `<:hive:${this.hiveEmojiId}>` : '';
  }

  set mapGameTypes(gameTypes: String[]) {
    this._mapGameTypes = gameTypes || [];
  }

  mapGameTypeActive(gameType: GameType){
    return this._mapGameTypes.length === 0 || this._mapGameTypes.indexOf(gameType.id) !== -1;
  }

  set doSendTeamChange(send: boolean){
    if(send !== undefined){
      this._doSendTeamChange = send;
    }
  }

  get doSendTeamChange(){
    return this._doSendTeamChange;
  }

  set doSendNewMaps(send: boolean){
    if(send !== undefined){
      this._doSendNewMaps = send;
    }
  }

  get doSendNewMaps(){
    return this._doSendNewMaps;
  }

  constructor(id: string, key: string){
    super(id, key);
  }

  sendNewMap(map: GameMap){
    if(!this.doSendNewMaps) return;

    if(!this.mapGameTypeActive(map.gameType)) return;

    const embed = new RichEmbed();
    embed.setURL("https://hive.lergin.de/maps");
    embed.setTitle(`${this.hiveEmoji} New ${map.gameType.name} Map ${this.hiveEmoji}`);
    embed.addField("Game", map.gameType.name, true);

    if (sendWorldNameGameTypes.indexOf(map.gameType.id) === -1){
      embed.addField("Map", (map.mapName || map.worldName), true);
    }else{
      if(map.mapName){
        embed.addField("Map", `${map.mapName} (${map.worldName})`, true);
      }else{
        embed.addField("Map", map.worldName, true);
      }
    }

    if(map.author){
      embed.addField("Created by", `*${map.author}*`, true);
    }
    embed.setFooter(`The map was just added to the API, it may take some weeks before you can play it on the server`);

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
        body = `${player.name} is no longer a Moderator :(`;
        break;
      case ChangeType.SENIOR_MODERATOR_ADD:
        title = 'New Senior Moderator';
        body = `${player.name} is now a Senior Moderator!`;
        break;
      case ChangeType.SENIOR_MODERATOR_REMOVE:
        title = 'A Senior Moderator left the Team';
        body = `${player.name} is no longer a Senior Moderator :(`;
        break;
      case ChangeType.DEVELOPER_ADD:
        title = 'New Developer';
        body = `${player.name} is now a Developer!`;
        break;
      case ChangeType.DEVELOPER_REMOVE:
        title = 'A Developer left the Team';
        body = `${player.name} is no longer a Developer :(`;
        break;
      case ChangeType.OWNER_ADD:
        title = 'New Owner';
        body = `${player.name} is now an Owner!`;
        break;
      case ChangeType.OWNER_REMOVE:
        title = 'An Owner left the Hive';
        body = `${player.name} is no longer an Owner o.O`;
        break;
      default:
        title = 'Something changed in the team of the Hive';
        body = `${player.name} is now something else but we don't know what...`;
        break;
    }

    const embed = new RichEmbed();
    embed.setURL("https://hive.lergin.de/team");
    embed.setTitle(`${this.hiveEmoji} ${title} ${this.hiveEmoji}`);
    embed.setDescription(body);

    this.send(embed);
  }

  sendCount(type, count: Number){}
}

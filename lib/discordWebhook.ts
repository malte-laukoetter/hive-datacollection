import { GameMap, Player, GameTypes } from "hive-api";
import { ChangeType } from "./team";
import { WebhookClient, RichEmbed } from "discord.js";
import { TwitterBot } from "node-twitterbot";

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
}

export class DiscordWebhook extends WebhookClient implements NotificationSubscriber {
  private _doSendTeamChange: boolean = true;
  private _doSendNewMaps: boolean = true;
  hiveEmojiId: String = ''

  private get hiveEmoji(): String{
    return `<:hive:${this.hiveEmojiId}>`;
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

    const embed = new RichEmbed();
    embed.setURL("https://hive.lergin.de/maps");
    embed.setTitle(`${this.hiveEmoji} New ${map.gameType.name} Map ${this.hiveEmoji}`);
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

    this.send(`${this.hiveEmoji} **${title}** ${this.hiveEmoji}\n${body}`);
  }
}

export class NotificationTwitterBot implements NotificationSubscriber {
  private _bot: TwitterBot;

  constructor(twitterBotSettings){
    this._bot = new TwitterBot(twitterBotSettings);
  }
  
  send(message){
    console.log(message);
    this._bot.tweet(message);
  }

  sendNewMap(map: GameMap){
    let message = `There is a new ${map.gameType.name} map on @theHiveMC!\n\n${map.mapName} by ${map.author}`;
    let adv = `\n\nhttps://hive.lergin.de/maps`

    if (message.length + adv.length <= 140) {
      message += adv;
    }

    this.send(message);
  }

  sendTeamChange(player: Player, type: ChangeType){
    let message = ""

    switch (type) {
      case ChangeType.MODERATOR_ADD:
        message = `${player.name} is now a Moderator on @theHiveMC!`;
        break;
      case ChangeType.MODERATOR_REMOVE:
        message = `${player.name} is no longer a Moderator on @theHiveMC ☹️`;
        break;
      case ChangeType.SENIOR_MODERATOR_ADD:
        message = `${player.name} is now a Senior Moderator on @theHiveMC!`;
        break;
      case ChangeType.SENIOR_MODERATOR_REMOVE:
        message = `${player.name} is no longer a Senior Moderator on @theHiveMC 😢`;
        break;
      case ChangeType.DEVELOPER_ADD:
        message = `${player.name} is now a Developer on @theHiveMC!`;
        break;
      case ChangeType.DEVELOPER_REMOVE:
        message = `${player.name} is no longer a Developer on @theHiveMC 😭`;
        break;
      case ChangeType.OWNER_ADD:
        message = `${player.name} is now an Owner on @theHiveMC!`;
        break;
      case ChangeType.OWNER_REMOVE:
        message = `${player.name} is no longer an Owner on @theHiveMC 😱`;
        break;
      default:
        message = `${player.name} is now something else on @theHiveMC but we don't know what...`;
        break;
    }

    let adv = `\n\nhttps://hive.lergin.de/team`

    if(message.length + adv.length <= 140){
      message += adv;
    }

    this.send(message);
  }
}
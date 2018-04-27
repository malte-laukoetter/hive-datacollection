import { GameMap, Player, GameTypes, GameType } from "hive-api";
import { RichEmbed } from "discord.js";
import { DiscordWebhook as _DiscordWebhook } from "lergins-bot-framework";
import { ChangeType } from "../updater/TeamUpdater";
import { NotificationTypes } from "./NotificationTypes";

const sendWorldNameGameTypes = [GameTypes.BED.id, GameTypes.SKY.id, GameTypes.GNT.id]

export class DiscordWebhook extends _DiscordWebhook {
  private _doSendTeamChange: boolean = true;
  private _doSendNewMaps: boolean = true;
  private _doSendTweets: boolean = false;
  private _mapGameTypes: String[] = [];
  hiveEmojiId: String = ''

  constructor(settings) {
    super(settings);

    this.hiveEmojiId = settings.hiveEmojiId;
    this.doSendNewMaps = settings.sendNewMapMessage;
    this.doSendTeamChange = settings.sendTeamChangeMessage;
    this.doSendTweets = settings.sendTweets;
    this.mapGameTypes = settings.mapGameTypes;
  }

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

  set doSendTweets(send: boolean){
    if(send !== undefined){
      this._doSendTweets = send;
    }
  }

  get doSendTweets(){
    return this._doSendTweets;
  }

  update(key: string, data: any){
    switch(key){
      case NotificationTypes.NEW_MAP:
        return this.sendNewMap(data);
      case NotificationTypes.TEAM_CHANGE:
        return this.sendTeamChange(data.player, data.type);
      case NotificationTypes.TWEET:
        return this.sendTweet(data);
    }
  }

  sendNewMap(map: GameMap){
    if(!this.doSendNewMaps) return;

    if(!this.mapGameTypeActive(map.gameType)) return;

    const embed = new RichEmbed();
    embed.setURL("https://hive.lergin.de/maps");
    embed.setTitle(`${this.hiveEmoji} New ${map.gameType.name} Map ${this.hiveEmoji}`);
    embed.addField("Game", map.gameType.name, true);

    if (sendWorldNameGameTypes.indexOf(map.gameType.id) === -1){
      embed.addField("Map", (map.mapName && map.mapName !== "UnknownMap" ? map.mapName : map.worldName), true);
    }else{
      if (map.mapName && map.mapName !== "UnknownMap"){
        embed.addField("Map", `${map.mapName} (${map.worldName})`, true);
      }else{
        embed.addField("Map", map.worldName, true);
      }
    }

    if (map.author && map.author !== "UnknownAuthor"){
      embed.addField("Created by", `*${map.author}*`, true);
    }
    embed.setFooter(`The map was just added to the API, it may take some time before you can play it on the server`);

    this.send({ embeds: [embed] });
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
      case ChangeType.NECTAR_ADD:
        title = 'New Team Nectar Member';
        body = `${player.name} is now a member of Team Nectar!`;
        break;
      case ChangeType.NECTAR_REMOVE:
        title = 'Someone left Team Nectar';
        body = `${player.name} is no longer active on Team Nectar :(`;
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

    this.send({ embeds: [embed] });
  }

  sendTweet(data) {
    if (this.doSendTweets) {
      this.send(`https://twitter.com/${data.user.screen_name}/status/${data.id_str}`);
    }
  }
}

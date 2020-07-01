import { GameMap, Player, GameTypes, GameType } from "hive-api";
import { RichEmbed } from "discord.js";
import { DiscordWebhook as _DiscordWebhook } from "lergins-bot-framework";
import { NotificationTypes } from "./NotificationTypes";

const sendWorldNameGameTypes = [GameTypes.BED.id, GameTypes.SKY.id, GameTypes.GNT.id]

export class DiscordWebhook extends _DiscordWebhook {
  private _doSendNewMaps: boolean = true;
  private _doSendTweets: boolean = false;
  private _mapGameTypes: String[] = [];
  hiveEmojiId: String = ''

  constructor(settings) {
    super(settings);

    this.hiveEmojiId = settings.hiveEmojiId;
    this.doSendNewMaps = settings.sendNewMapMessage;
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

  sendTweet(data) {
    if (this.doSendTweets) {
      this.send(`https://twitter.com/${data.user.screen_name}/status/${data.id_str}`);
    }
  }
}

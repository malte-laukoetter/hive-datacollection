import { GameMap, Player, GameTypes, GameType } from 'hive-api';
import { config } from '../bot';

export class MessageProvider{
  static async uniquePlayerTwitterMessage(amount){
    const params: Map<string, string> = new Map();
    params.set("AMOUNT", MessageProvider.numFormat(amount));

    let message = await config().get("twitter.messages.uniquePlayerAmountServer").then(MessageProvider.randomElement);
    message += "\n\nhttps://hive.lergin.de";

    return MessageProvider.replaceMessageParams(message, params);
  }

  static async uniquePlayerGameTypeTwitterMessage(amount, gameType: GameType){
    const params: Map<string, string> = new Map();
    params.set("AMOUNT", MessageProvider.numFormat(amount));
    params.set("GAMETYPE", gameType.name);

    let messages: Promise<string[]>;
    
    if (await config().hasPath(`twitter.messages.uniquePlayerAmountGameType.${gameType.id}`) && Math.random() > 0.2){
      messages = config().get(`twitter.messages.uniquePlayerAmountGameType.${gameType.id}`);
    } else {
      messages = config().get(`twitter.messages.uniquePlayerAmountGameType.all`);
    }

    let message: string = await messages.then(MessageProvider.randomElement);
    message += "\n\nhttps://hive.lergin.de";

    return MessageProvider.replaceMessageParams(message, params);
  }

  private static numFormat(num){
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")
  }

  private static replaceMessageParams(message, params: Map<string, string>){
    [... params.entries()].forEach(([param, value]) => {
      message = message.replace(param, value);
    });

    return message;
  }

  private static randomElement(arr){
    return arr[Math.floor(Math.random() * arr.length)];
  }
}
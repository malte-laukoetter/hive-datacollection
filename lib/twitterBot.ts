import { TwitterBot } from "node-twitterbot";
import { GameMap, Player, GameTypes, GameType } from 'hive-api';
import { NotificationSubscriber} from './discordWebhook';
import { ChangeType } from "./team";
import { TwitterHandleProvider } from "./TwitterHandleProvider";

const sendWorldNameGameTypes = [GameTypes.BED.id, GameTypes.SKY.id, GameTypes.GNT.id];

export class NotificationTwitterBot implements NotificationSubscriber {
  private _bot: TwitterBot;

  constructor(twitterBotSettings) {
    this._bot = new TwitterBot(twitterBotSettings);
  }

  send(message) {
    this._bot.tweet(message,err => {
      if(err) console.error(err);
    });
  }

  async sendNewMap(map: GameMap) {
    let message = `There is a new ${map.gameType.name} map on @theHiveMC!\n\n`
    
    if(map.mapName && map.mapName !== "UnknownMap"){
      if (sendWorldNameGameTypes.indexOf(map.gameType.id) === -1) {
        message += map.mapName;
      }else{
        message += `${map.mapName} (${map.worldName})`;
      }
    }else{
      message += map.worldName;
    }

    if (map.author && map.author !== "UnknownAuthor") {
      // load the twitter handles of the creators
      let twitterHandles: Map<string, string> = new Map();

      await Promise.all(
        getNamesFromMapAuthor(map.author)
          .map(async name => twitterHandles.set(name, await TwitterHandleProvider.instance.get(new Player(name))))
      );

      let author: string = map.author;

      // replace the names by the handles
      [...twitterHandles.entries()].forEach(([name, handle]) => {
        let replaceName = name;

        if (handle === name) {
          replaceName = `@${name}`;
        } else if (handle) {
          replaceName = `${name} (@${handle})`;
        }

        author = author.replace(name, replaceName);
      });
      
      message += ` by ${author}`;
    }

    let note = `\n\nIt may not be playable yet...`

    if (message.length + note.length <= 140) {
      message += note;
    }

    let adv = `\nhttps://hive.lergin.de/maps`

    if (message.length + adv.length <= 140) {
      message += adv;
    }

    this.send(message);
  }

  async sendTeamChange(player: Player, type: ChangeType) {
    let message = "";
    let twitterHandle = await TwitterHandleProvider.instance.get(player);

    if (twitterHandle === player.name) {
      message = `@${player.name} `;
    } else if (twitterHandle) {
      message = `${player.name} (@${twitterHandle}) `;
    } else {
      message = `${player.name} `;
    }

    switch (type) {
      case ChangeType.MODERATOR_ADD:
        message += `is now a Moderator on @theHiveMC 🙂`;
        break;
      case ChangeType.MODERATOR_REMOVE:
        message += `is no longer a Moderator on @theHiveMC ☹️`;
        break;
      case ChangeType.SENIOR_MODERATOR_ADD:
        message += `is now a Senior Moderator on @theHiveMC 😃`;
        break;
      case ChangeType.SENIOR_MODERATOR_REMOVE:
        message += `is no longer a Senior Moderator on @theHiveMC 😢`;
        break;
      case ChangeType.DEVELOPER_ADD:
        message = `🎉 ${message} is now a Developer on @theHiveMC 🎉`;
        break;
      case ChangeType.DEVELOPER_REMOVE:
        message += `is no longer a Developer on @theHiveMC 😭`;
        break;
      case ChangeType.OWNER_ADD:
        message = `🎉🎉🎉 ${message} is now an Owner on @theHiveMC 🎉🎉🎉`;
        break;
      case ChangeType.OWNER_REMOVE:
        message += `is no longer an Owner on @theHiveMC 😱`;
        break;
      default:
        message += `is now something else on @theHiveMC but we don't know what 🤔`;
        break;
    }

    let adv = `\n\nhttps://hive.lergin.de/`

    if(message.length + adv.length + 'player/'.length + player.uuid.length <= 140){
      message += adv;
      message += 'player/';
      message += player.uuid;
    } else if (message.length + adv.length + 'player/'.length + player.name.length <= 140){
      message += adv;
      message += 'player/';
      message += player.name
    } else if (message.length + adv.length + 'team'.length <= 140){
      message += adv;
      message += 'team';
    }

    this.send(message);
  }

  sendCount(type, count: Number) {
    if(type === "uniquePlayers"){
      this.sendUniquePlayer(count)
    }else if(type.name){
      this.sendPlayerGameMode(count, type);
    }else{
      throw new Error(`Unknown Type: ` + type);
    }
  }

  sendUniquePlayer(amount){
    let messages = [
      `${amount} unique players have joined @theHiveMC 🎉`,
      `${amount} unique 🐝 have joined @theHiveMC!`,
      `${amount} 🐝 have been flying on @theHiveMC 🎉`
    ]
    this.send(messages[Math.floor(Math.random() * messages.length)] + "\n\nhttps://hive.lergin.de")
  }

 

  sendPlayerGameMode(amount, gameType: GameType){
    amount = amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

    let gameSpecificMessages = new Map([
      [
        GameTypes.BED.id, [
          `${amount} bees are defending their beds 🛏️ in BedWars on @theHiveMC`
        ]
      ], [
        GameTypes.HIDE.id, [
          `Did you already find all ${amount} players that are hiding and seeking on @theHiveMC?`
        ]
      ], [
        GameTypes.LAB.id, [
          `Dr Zuk 👨🏾‍🔬 had ${amount} test subjects testing the experiments in The Lab on @theHiveMC`
        ]
      ], [
        GameTypes.DR.id, [
          `${amount} tried to outrun the Death in DeathRun on @theHiveMC`
        ]
      ], [
        GameTypes.DRAW.id, [
          `${amount} 👩‍🎨👨‍🎨 have been drawing 🎨 in Draw It on @theHiveMC`
        ]
      ], [
        GameTypes.CAI.id, [
          `${amount} cowboys and indians tried to capture the opposing leader on @theHiveMC 🤠🏇`
        ]
      ]
    ]);
    
    let messages = [
      `${amount} players have played ${gameType.name} on @theHiveMC 🎉`,
      `${gameType.name} now had ${amount} unique players on @theHiveMC!`,
      `${amount} 🐝 played ${gameType.name} on @theHiveMC!`,
      `${amount} 🐝 have already tried ${gameType.name} on @theHiveMC!`,
      `How many players have already played ${gameType.name} on @theHiveMC? ${amount} bees 🎉`
    ];

    let message = "";

    if (!gameSpecificMessages.has(gameType.id) || Math.random() > 0.8){
      message = messages[Math.floor(Math.random() * messages.length)];
    }else{
      message = gameSpecificMessages.get(gameType.id)[Math.floor(Math.random() * gameSpecificMessages.get(gameType.id).length)]
    }

    this.send(message + "\n\nhttps://hive.lergin.de")
  }
}

function getNamesFromMapAuthor(str): string[] {
  const blacklist = [
    "UnknownAuthor",
    "ProjectCondas",
    "OdysseyBuilds",
    "and"
  ]

  return str
  // split at a space, comma or between names
  .split(/([^a-zA-Z0-9_]( |and)|( |and)[^a-zA-Z0-9_]|,)/g)
  // remove stuff like undefined
  .filter(s => s)
  // remove everything that has special charactars inside the word (eg. Team Nectar or youtube links)
  .filter(s => s.match(/^([^a-zA-Z0-9_]*)[a-zA-Z0-9_]+([^a-zA-Z0-9_]*)$/, ""))
  // replace the special chars at the end and beginning
  .map(s => s.replace(/[^a-zA-Z0-9_]/g, ""))
  // and filter out strings that can't be minecraft names
  .filter(s => s.match(/[a-zA-Z0-9_]{1,16}/) !== null)
  // remove blacklisted names
  .filter(s => blacklist.indexOf(s) === -1);
}

/*
// Tests for the function getNamesFromMapAuthor

const testCases: Map<string, string[]> = new Map();

testCases.set("", []);
testCases.set("Little_Tigress, Fowben, demcmd", ["Little_Tigress", "Fowben", "demcmd"]);
testCases.set("Team Nectar (cjeich)", ["cjeich"]);
testCases.set("turtlelord66 & Jaap", ["turtlelord66", "Jaap"]);
testCases.set("Team Nectar - Xoa", ["Xoa"]);
testCases.set("kwirky", ["kwirky"]);
testCases.set("LordDeWitt + Timmetatsch", ["LordDeWitt", "Timmetatsch"]);
testCases.set("Community Map (sphere + cjeich)", ["sphere", "cjeich"]);
testCases.set("Quazymoodo - Team Pugro", ["Quazymoodo"]);
testCases.set("Odyssey Builds", []);
testCases.set("UnknownAuthor", []);
testCases.set("Essej2 and ILyraI", ["Essej2", "ILyraI"]);
testCases.set("Team Nectar", []);
testCases.set("Zzbiohazardx (Team Vareide)", ["Zzbiohazardx"]);
testCases.set("Team Herobox & Team Red Diamond", []);
testCases.set("FyreUK & K1ll1er - http://www.youtube.com/FyreUK", ["FyreUK", "K1ll1er"]);
testCases.set("http://youtube.com/SomethingMLG - TwinkleMan, Flomarrisnix1123, datwr", ["TwinkleMan", "Flomarrisnix1123", "datwr"]);
testCases.set("Team Nectar (Goldfan, Sphere + Nistune)", ["Goldfan", "Sphere", "Nistune"]);
testCases.set("Team Nectar (Supermassimo, goldfangl14)", ["Supermassimo", "goldfangl14"]);
testCases.set("PalmSprings, Tibbz123, LakeOntario, Moneyyy", ["PalmSprings", "Tibbz123", "LakeOntario", "Moneyyy"]);
testCases.set("PalmSprings,Tibbz123,LakeOntario,Moneyyy", ["PalmSprings", "Tibbz123", "LakeOntario", "Moneyyy"]);

console.log("Starting the tests");
[...testCases.entries()].forEach(([str, res]) => {
  let x = getNamesFromMapAuthor(str)

  if(x.length !== res.length || !x.every((v,i) => v === res[i])){
    console.error(`Error while parsing ${str}: expected ${JSON.stringify(res)} got ${JSON.stringify(getNamesFromMapAuthor(str))}`);
  }
})
console.log("All tests done!")
*/

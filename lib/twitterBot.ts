import { TwitterBot } from "node-twitterbot";
import * as fetch from 'node-fetch';
import { GameMap, Player } from 'hive-api';
import { NotificationSubscriber} from './discordWebhook';
import { ChangeType } from "./team";

export class NotificationTwitterBot implements NotificationSubscriber {
  private _bot: TwitterBot;

  constructor(twitterBotSettings) {
    this._bot = new TwitterBot(twitterBotSettings);
  }

  send(message) {
    this._bot.tweet(message);
  }

  async sendNewMap(map: GameMap) {
    let message = `There is a new ${map.gameType.name} map on @theHiveMC!\n\n${map.mapName || map.worldName}`

    if (map.author) {
      // load the twitter handles of the creators
      let twitterHandles: Map<string, string> = new Map();

      await Promise.all(
        getNamesFromMapAuthor(map.author)
        .map(async name => twitterHandles.set(name, await getTwitterHandel(new Player(name))))
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
    let twitterHandle = await getTwitterHandel(player);

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

    let adv = `\n\nhttps://hive.lergin.de/team`

    if (message.length + adv.length <= 140) {
      message += adv;
    }

    this.send(message);
  }
}


const namemcUrl = `https://namemc.com/profile/`;

function getNameMcTwitter(uuid) {
  return fetch(namemcUrl + uuid)
    .then(res => res.text())
    .then(res => res.match(/(?:href=\"https:\/\/twitter\.com\/)((\w){1,15})(?=\" target)/))
    .then(res => res ? res[1] ? res[1] : null : null)
}

async function getTwitterHandel(player){
  let twitterHandle = await player.getTwitter();

  if (!twitterHandle) {
    twitterHandle = await getNameMcTwitter(player.uuid || player.name);
  }

  return twitterHandle;
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

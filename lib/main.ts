import { GameTypes, setMinTimeBetweenRequests, Ranks} from "hive-api";
import { BotFramework, Updater } from "lergins-bot-framework";
import * as path from "path";

import { DiscordWebhook } from "./notifications/DiscordWebhook";
import { TwitterBot } from "./notifications/TwitterBot";
import { Stats } from "./Stats";
import { CurrPlayerUpdater } from "./updater/CurrPlayerUpdater";
import { AchievementUpdater } from "./updater/AchievementUpdater";
import { GamePlayersUpdater } from "./updater/GamePlayersUpdater";
import { MapUpdater } from "./updater/MapUpdater";
import { MedalUpdater } from "./updater/MedalUpdater";
import { PlayerStatsUpdater } from "./updater/PlayerStatsUpdater";
import { TeamUpdater, ChangeType } from "./updater/TeamUpdater";
import { TokenUpdater } from "./updater/TokenUpdater";
import { TotalKillsUpdater } from "./updater/TotalKillsUpdater";
import { UniquePlayerUpdater } from "./updater/UniquePlayerUpdater";
import { GameLeaderboardUpdater } from "./updater/GameLeaderboardsUpdater";
import { TotalPointsUpdater } from "./updater/TotalPointsUpdater";

export const bot = new BotFramework.Builder()
    .configFolderPath(path.join(__dirname, '..'))
    .observer('twitter', TwitterBot)
    .observer('discord-webhook', DiscordWebhook)
    .forceFirebaseInit()
    .build();

bot.addUpdater(new AchievementUpdater())
bot.addUpdater(new CurrPlayerUpdater())
bot.addUpdater(new GamePlayersUpdater())
bot.addUpdater(new MapUpdater())
bot.addUpdater(new MedalUpdater())
bot.addUpdater(new PlayerStatsUpdater())
bot.addUpdater(new TeamUpdater())
bot.addUpdater(new TokenUpdater())
bot.addUpdater(new TotalPointsUpdater())
bot.addUpdater(new TotalKillsUpdater())
bot.addUpdater(new UniquePlayerUpdater())

export default bot;
export function config() { return bot.config() }
export function notificationSender() { return bot.notificationSender() }
export function addUpdater(updater: Updater) { return bot.addUpdater(updater) }
export function start() { return bot.start() }
export function send(type: string, message: any) { bot.send(type, message) }

async function main() {
    setMinTimeBetweenRequests((await bot.config().get('min_time_between_requests')) || 1400);
    
    process.on('SIGTERM', async () => {
        Stats.print();
        await Stats.saveToGoogleSheets();
        
        console.log(`Stopped!`);
        
        process.exit();
    });
    
    await Promise.all([
        GameTypes.update(),
        Ranks.update()
    ]);
    
    console.log("Updated Game and Rank lists.");
    
    GameTypes.list.forEach(type => bot.addUpdater(new GameLeaderboardUpdater(type)));

    if(await config().get("updater_active")){
        bot.start();
    }else{
        console.warn(`!!! DEBUG MODE !!!`)
    }
}

main().catch(console.error);

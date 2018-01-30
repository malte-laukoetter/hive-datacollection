import { initializeApp, credential, database, firestore } from "firebase-admin";
import { GameTypes, setMinTimeBetweenRequests, GameMap, Player, Ranks} from "hive-api";

import { DiscordWebhook } from "./notifications/DiscordWebhook";
import { NotificationSender } from "./notifications/NotificationSender";
import { NotificationTwitterBot } from "./notifications/TwitterBot";
import { Config, ConfigEventType } from "./config/Config";
import { JsonConfig } from "./config/JsonConfig";
import { FirebaseConfig } from "./config/FirebaseConfig";
import { Stats } from "./Stats";
import { CurrPlayerUpdater } from "./updater/CurrPlayerUpdater";
import { Updater } from "./updater/Updater";
import { AchievementUpdater } from "./updater/AchievementUpdater";
import { GamePlayersUpdater } from "./updater/GamePlayersUpdater";
import { MapUpdater } from "./updater/MapUpdater";
import { MedalUpdater } from "./updater/MedalUpdater";
import { PlayerStatsUpdater } from "./updater/PlayerStatsUpdater";
import { TeamUpdater } from "./updater/TeamUpdater";
import { TokenUpdater } from "./updater/TokenUpdater";
import { TotalKillsUpdater } from "./updater/TotalKillsUpdater";
import { UniquePlayerUpdater } from "./updater/UniquePlayerUpdater";
import { GameLeaderboardUpdater } from "./updater/GameLeaderboardsUpdater";

let configFile: any = { use_firebase: true, firebase_service_account: 'firebase_service_account.json' };
try {
    configFile = require("../config.json");
} catch (ex) {
    console.log(`No config file provided: Trying to load from firebase using firebase_service_account.json`);
}

const serviceAccount = require(`../${configFile.firebase_service_account}`);

console.log(`Using firebase project: ${serviceAccount.project_id}`)

initializeApp({
    credential: credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = database();
const fireStore = firestore();

if (configFile.use_firebase){
    console.log(`Loading configuration from firebase (${serviceAccount.project_id})`);
    new FirebaseConfig(db.ref(configFile.firebase_config_path || "config"));
}else{
    console.log(`Loading configuration from config.json`);
    new JsonConfig(configFile);
}

async function main() {
    initDiscordWebhooks();

    initTwitterBots();

    setMinTimeBetweenRequests((await Config.get('min_time_between_requests')) || 1400);

    console.log("Started!");

    process.on('SIGTERM',() => {
        Stats.print();

        console.log(`Stopped!`);

        process.exit();
    });

    await Promise.all([
        GameTypes.update(),
        Ranks.update()
    ]);

    console.log("Updated Game and Rank lists.");    

    if(await Config.get("updater_active")){
        const updaters: Set<Updater> = new Set();
        updaters.add(new AchievementUpdater(db));
        updaters.add(new CurrPlayerUpdater(db));
        updaters.add(new GamePlayersUpdater(db));
        updaters.add(new MapUpdater(db));
        updaters.add(new MedalUpdater(db));
        updaters.add(new PlayerStatsUpdater(db));
        updaters.add(new TeamUpdater(db));
        updaters.add(new TokenUpdater(db));
        updaters.add(new TotalKillsUpdater(db));
        updaters.add(new UniquePlayerUpdater(db));

        await Promise.all([... updaters.values()].map(async updater => {
            updater.startTime = (await Config.get(`updater.${updater.id}.startTime`) || -1);

            Config.on(`updater.${updater.id}.interval`, ConfigEventType.VALUE, val => updater.interval = val);

            return;
        }));

        // initialising game leaderboard updaters extra as we only want one config for all
        const gameLeaderboardsUpdaters = GameTypes.list.map(type => new GameLeaderboardUpdater(fireStore, type));
        const gameLeaderboardsStartTime = (await Config.get(`updater.leaderboard_gametype.startTime`) || -1);
        gameLeaderboardsUpdaters.forEach(updater => updater.startTime = gameLeaderboardsStartTime);

        Config.on(`updater.leaderboard_gametype.interval`, ConfigEventType.VALUE, val => gameLeaderboardsUpdaters.forEach(updater => updater.interval = val));

        gameLeaderboardsUpdaters.forEach(updater => updaters.add(updater));


        updaters.forEach(updater => {
            updater.init();
        });

        console.log(`Initialized ${updaters.size} Updaters`);
    }else{
        console.warn(`!!! DEBUG MODE !!!`)
    }
}

main().catch(console.error);

function initDiscordWebhooks(){
    const discordWebhooks: Map<String, DiscordWebhook> = new Map();

    function registerWebhook(settings, key) {
        if (!settings.id || !settings.key) throw new Error("Each webhook needs an id and a key!")

        const discordWebhook = new DiscordWebhook(settings.id, settings.key);
        discordWebhook.hiveEmojiId = settings.hiveEmojiId;
        discordWebhook.doSendNewMaps = settings.sendNewMapMessage;
        discordWebhook.doSendTeamChange = settings.sendTeamChangeMessage;
        discordWebhook.doSendTweets = settings.sendTweets;
        discordWebhook.mapGameTypes = settings.mapGameTypes;

        discordWebhooks.set(key, discordWebhook);
        NotificationSender.register(discordWebhook);
    }

    function unregisterWebhook(key) {
        NotificationSender.unregister(discordWebhooks.get(key));
        discordWebhooks.delete(key);
    }

    Config.on("discord.webhooks", ConfigEventType.CHILD_ADDED, (hook, key) => {
        registerWebhook(hook, key);
        console.log(`Registered DiscordWebhook ${hook.id} (${key})`);
    });

    Config.on("discord.webhooks", ConfigEventType.CHILD_CHANGED, (hook, key) => {
        unregisterWebhook(key);
        registerWebhook(hook, key);
        console.log(`Updated DiscordWebhook ${hook.id} (${key})`);
    });

    Config.on("discord.webhooks", ConfigEventType.CHILD_REMOVED, (hook, key) => {
        unregisterWebhook(key);
        console.log(`Deleted DiscordWebhook ${hook.id} (${key})`);
    });
}

function initTwitterBots(){
    const twitterBots: Map<String, NotificationTwitterBot> = new Map();

    Config.on("twitter.bots", ConfigEventType.CHILD_ADDED, (botConfig, key) => {
        const bot = new NotificationTwitterBot(botConfig);
        twitterBots.set(key, bot);
        NotificationSender.register(bot);

        console.log(`Registered TwitterBot ${botConfig.consumer_key} (${key})`);
    });

    Config.on("twitter.bots", ConfigEventType.CHILD_CHANGED, (botConfig, key) => {
        NotificationSender.unregister(twitterBots.get(key));

        const bot = new NotificationTwitterBot(botConfig);
        twitterBots.set(key, bot);
        NotificationSender.register(bot);

        console.log(`Updated TwitterBot ${botConfig.consumer_key} (${key})`);
    });

    Config.on("twitter.bots", ConfigEventType.CHILD_REMOVED, (botConfig, key) => {
        NotificationSender.unregister(twitterBots.get(key));
        twitterBots.delete(key);

        console.log(`Deleted TwitterBot ${botConfig.consumer_key} (${key})`);
    });
}

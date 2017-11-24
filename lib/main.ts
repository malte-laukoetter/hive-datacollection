import * as admin from "firebase-admin";
import { GameTypes, setMinTimeBetweenRequests, GameMap, Player} from "hive-api";

import { TotalPointsUpdater } from "./updater/TotalPointsUpdater";
import { TeamUpdater, ChangeType} from "./updater/TeamUpdater";
import { MapUpdater } from "./updater/MapUpdater";
import { AchievementUpdater } from "./updater/AchievementUpdater";
import { TokenUpdater } from "./updater/TokenUpdater";
import { MedalUpdater } from "./updater/MedalUpdater";
import { GamePlayersUpdater } from "./updater/GamePlayersUpdater";
import { PlayerStatsUpdater } from "./updater/PlayerStatsUpdater";
import { TotalKillsUpdater } from "./updater/TotalKillsUpdater"
import { UniquePlayerUpdater } from "./updater/UniquePlayerUpdater";
import { DiscordWebhook } from "./notifications/DiscordWebhook";
import { NotificationSender } from "./notifications/NotificationSender";
import { NotificationTwitterBot } from "./notifications/TwitterBot";
import { Config, ConfigEventType } from "./config/Config";
import { JsonConfig } from "./config/JsonConfig";
import { FirebaseConfig } from "./config/FirebaseConfig";

const configFile = require("../config.json") || { use_firebase: true };
const serviceAccount = require("../firebase_service_account_test.json");

console.log(`Using firebase project: ${serviceAccount.project_id}`)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.database();

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

    await GameTypes.update();

    if(await Config.get("updater_active")){
        const teamUpdater = new TeamUpdater(db);
        const mapUpdater = new MapUpdater(db);
        const uniquePlayerUpdater = new UniquePlayerUpdater(db);
        const medalUpdater = new MedalUpdater(db);
        const tokenUpdater = new TokenUpdater(db);
        const gamePlayersUpdater = new GamePlayersUpdater(db);
        const totalKillsUpdater = new TotalKillsUpdater(db);
        const totalPointsUpdater = new TotalPointsUpdater(db);
        const achievementUpdater = new AchievementUpdater(db);
        const playerStatsUpdater = new PlayerStatsUpdater(db);

        console.log("Starting TeamUpdater");
        teamUpdater.start();

        console.log("Starting MapUpdater");
        mapUpdater.start();

        console.log("Starting UniquePlayerCount Updater");
        uniquePlayerUpdater.start();

        setTimeout(() => {
            console.log("Starting MedalUpdater");
            medalUpdater.start();
            console.log("Starting TokensUpdater");
            tokenUpdater.start();
        }, 40 * 1000);

        setTimeout(() => {
            console.log("Starting GamePlayersUpdater");
            gamePlayersUpdater.start();
        }, 5 * 60 * 1000);

        setTimeout(() => {
            console.log("Starting TotalKillsUpdater");
            totalKillsUpdater.start();
        }, 6 * 60 * 1000);

        setTimeout(() => {
            console.log("Starting TotalPointsUpdater");
            totalPointsUpdater.start();
        }, 65 * 60 * 1000);

        setTimeout(() => {
            console.log("Starting AchievementUpdater");
            achievementUpdater.start();
        }, 125 * 60 * 1000);

        setTimeout(() => {
            console.log("Starting PlayerStatsUpdater");
            playerStatsUpdater.start();
        }, 165 * 60 * 1000);
    }else{
        
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

    Config.on("twitter", ConfigEventType.CHILD_CHANGED, (botConfig, key) => {
        NotificationSender.unregister(twitterBots.get(key));

        const bot = new NotificationTwitterBot(botConfig);
        twitterBots.set(key, bot);
        NotificationSender.register(bot);

        console.log(`Updated TwitterBot ${botConfig.consumer_key} (${key})`);
    });

    Config.on("twitter", ConfigEventType.CHILD_REMOVED, (botConfig, key) => {
        NotificationSender.unregister(twitterBots.get(key));
        twitterBots.delete(key);

        console.log(`Deleted TwitterBot ${botConfig.consumer_key} (${key})`);
    });
}

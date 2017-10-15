import * as admin from "firebase-admin"
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
import { TwitterHandleProvider } from "./notifications/TwitterHandleProvider";
import { Config, ConfigEventType } from "./config/Config";
import { JsonConfig } from "./config/JsonConfig";
import { FirebaseConfig } from "./config/FirebaseConfig";

const configFile = require("../config.json") || { use_firebase: true };
const serviceAccount = require("../firebase_service_account.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
});

const db = admin.database();

if (configFile.use_firebase){
    console.log(`Loading configuration from firebase (${serviceAccount.project_id})`);
    new FirebaseConfig(db.ref("config"));
}else{
    console.log(`Loading configuration from config.json`);
    new JsonConfig(configFile);
}

Config.on("discord.webhooks", ConfigEventType.CHILD_ADDED, hook => {
    if (!hook.id || !hook.key) throw new Error("Each webhook needs an id and a key!")

    const discordWebhook = new DiscordWebhook(hook.id, hook.key);
    discordWebhook.hiveEmojiId = hook.hiveEmojiId;
    discordWebhook.doSendNewMaps = hook.sendNewMapMessage;
    discordWebhook.doSendTeamChange = hook.sendTeamChangeMessage;
    discordWebhook.mapGameTypes = hook.mapGameTypes;
    NotificationSender.register(discordWebhook)
});

Config.on("twitter", ConfigEventType.CHILD_ADDED, config => {
    NotificationSender.register(new NotificationTwitterBot(config));
});

setMinTimeBetweenRequests(1400);

async function main() {
    console.log("Started!");

    await GameTypes.update();

    if(!await Config.get("debug")){
        console.log("Starting TeamUpdater");
        new TeamUpdater(db).start();

        console.log("Starting MapUpdater");
        new MapUpdater(db).start();

        console.log("Starting UniquePlayerCount Updater");
        new UniquePlayerUpdater(db).start();

        setTimeout(() => {
            console.log("Starting MedalUpdater");
            new MedalUpdater(db).start();
            console.log("Starting TokensUpdater");
            new TokenUpdater(db).start();
        }, 40 * 1000);

        setTimeout(() => {
            console.log("Starting GamePlayersUpdater");
            new GamePlayersUpdater(db).start();
        }, 5 * 60 * 1000);

        setTimeout(() => {
            console.log("Starting TotalKillsUpdater");
            new TotalKillsUpdater(db).start();
        }, 6 * 60 * 1000);

        setTimeout(() => {
            console.log("Starting TotalPointsUpdater");
            new TotalPointsUpdater(db).start();
        }, 65 * 60 * 1000);

        setTimeout(() => {
            console.log("Starting AchievementUpdater");
            new AchievementUpdater(db).start();
        }, 125 * 60 * 1000);

        setTimeout(() => {
            console.log("Starting PlayerStatsUpdater");
            new PlayerStatsUpdater(db).start();
        }, 165 * 60 * 1000);
    }else{
    }
}

main().catch(console.error);
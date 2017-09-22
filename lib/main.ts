import * as admin from "firebase-admin"
import {TotalPointsUpdater} from "./totalPoints";
import { GameTypes, setMinTimeBetweenRequests, GameMap, Player} from "hive-api";
import { TeamUpdater, ChangeType} from "./team";
import {MapUpdater} from "./maps";
import {AchievementUpdater} from "./achievements";
import {TokensUpdater} from "./tokens";
import {MedalUpdater} from "./medals";
import {GamePlayersUpdater} from "./GamePlayersUpdater";
import {PlayerStatsUpdater} from "./PlayerStatsUpdater";
import {TotalKillsUpdater} from "./kills";
import { DiscordWebhook, NotificationSender } from "./discordWebhook";
import { NotificationTwitterBot } from "./twitterBot";

const config = require("../config.json");
const serviceAccount = require("../firebase_service_account.json");


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: config.firebase.databaseURL
});

const db = admin.database();

config.discord.webhooks.forEach(hook => {
    if(!hook.id || !hook.key) throw new Error("Each webhook needs an id and a key!")

    const discordWebhook = new DiscordWebhook(hook.id, hook.key);
    discordWebhook.hiveEmojiId = hook.hiveEmojiId;
    discordWebhook.doSendNewMaps = hook.sendNewMapMessage;
    discordWebhook.doSendTeamChange = hook.sendTeamChangeMessage;
    discordWebhook.mapGameTypes = hook.mapGameTypes;
    NotificationSender.instance.register(discordWebhook)
});

config.twitter.forEach(config => {
    NotificationSender.instance.register(new NotificationTwitterBot(config));
})

setMinTimeBetweenRequests(1400);

async function main(){
    console.log("Started!");

    await GameTypes.update();

    console.log("Starting TeamUpdater");
    new TeamUpdater(db).start();

    console.log("Starting MapUpdater");
    new MapUpdater(db).start();

    setTimeout(() => {
        console.log("Starting MedalUpdater");
        new MedalUpdater(db).start();
        console.log("Starting TokensUpdater");
        new TokensUpdater(db).start();
    }, 40 * 1000);

    setTimeout(()=>{
        console.log("Starting GamePlayersUpdater");
        new GamePlayersUpdater(db).start();
    }, 5*60*1000);

    setTimeout(()=>{
        console.log("Starting TotalKillsUpdater");
        new TotalKillsUpdater(db).start();
    }, 6*60*1000);

    setTimeout(()=>{
        console.log("Starting TotalPointsUpdater");
        new TotalPointsUpdater(db).start();
    }, 65*60*1000);

    setTimeout(()=>{
        console.log("Starting AchievementUpdater");
        new AchievementUpdater(db).start();
    }, 125*60*1000);

    setTimeout(()=>{
        console.log("Starting PlayerStatsUpdater");
        new PlayerStatsUpdater(db).start();
    }, 165*60*1000);
}

main().catch(console.error);
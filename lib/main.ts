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
import {DiscordWebhook} from "./DiscordWebhook"

const config = require("../config.json");
const serviceAccount = require("../firebase_service_account.json");


admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: config.firebase.databaseURL
});

const db = admin.database();

const discordWebhook = new DiscordWebhook(config.discord.webhookId, config.discord.webhookKey);

discordWebhook.doSendNewMaps = config.discord.sendNewMapMessage;
discordWebhook.doSendTeamChange = config.discord.sendTeamChangeMessage;

discordWebhook.sendTeamChange(new Player("Lergin_"), ChangeType.MODERATOR_ADD)
discordWebhook.sendNewMap(new GameMap(GameTypes.BP, "NAME", "NAME", "AUTH"))

setMinTimeBetweenRequests(1000);
console.log("Started!");
/*
GameTypes.update();

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
}, 165*60*1000);*/
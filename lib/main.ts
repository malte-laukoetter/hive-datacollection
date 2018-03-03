import { initializeApp, credential, database, firestore } from "firebase-admin";
import { GameTypes, setMinTimeBetweenRequests, GameMap, Player, Ranks} from "hive-api";
import { BotFramework, ConfigEventType } from "lergins-bot-framework";
import * as path from "path";

import {config} from './bot';

import { DiscordWebhook } from "./notifications/DiscordWebhook";
import { TwitterBot } from "./notifications/TwitterBot";
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


const db = database();
const fireStore = firestore();

async function main() {
    setMinTimeBetweenRequests((await config().get('min_time_between_requests')) || 1400);

    console.log("Started!");

    process.on('SIGTERM', () => {
        Stats.print();

        console.log(`Stopped!`);

        process.exit();
    });

    await Promise.all([
        GameTypes.update(),
        Ranks.update()
    ]);

    console.log("Updated Game and Rank lists.");    

    if(await config().get("updater_active")){
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
            updater.startTime = (await config().get(`updater.${updater.id}.startTime`) || -1);

            config().on(`updater.${updater.id}.interval`, ConfigEventType.VALUE, val => updater.interval = val);

            return;
        }));

        // initialising game leaderboard updaters extra as we only want one config for all
        const gameLeaderboardsUpdaters = GameTypes.list.map(type => new GameLeaderboardUpdater(fireStore, type));
        const gameLeaderboardsStartTime = (await config().get(`updater.leaderboard_gametypes.startTime`) || -1);
        gameLeaderboardsUpdaters.forEach(updater => updater.startTime = gameLeaderboardsStartTime);

        config().on(`updater.leaderboard_gametypes.interval`, ConfigEventType.VALUE, val => gameLeaderboardsUpdaters.forEach(updater => updater.interval = val));

        gameLeaderboardsUpdaters.forEach(updater => updaters.add(updater));


        updaters.forEach(updater => {
            try {
                updater.init();
            }catch(err){
                console.error(`Error with updater ${updater.id}`, err);
            }
        });

        console.log(`Initialized ${updaters.size} Updaters`);
    }else{
        console.warn(`!!! DEBUG MODE !!!`)
    }
}

main().catch(console.error);

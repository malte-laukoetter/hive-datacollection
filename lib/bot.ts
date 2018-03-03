import * as path from "path";
import { BotFramework } from "lergins-bot-framework";
import { TwitterBot } from "./notifications/TwitterBot";
import { DiscordWebhook } from "./notifications/DiscordWebhook";

export const bot = new BotFramework.Builder()
  .configFolderPath(path.join(__dirname, '..'))
  .observer('twitter', TwitterBot)
  .observer('discord-webhook', DiscordWebhook)
  .forceFirebaseInit()
  .build() as BotFramework;

export default bot;
export function config(){ return bot.config() }
export function notificationSender() { return bot.notificationSender() }
export const send = bot.send

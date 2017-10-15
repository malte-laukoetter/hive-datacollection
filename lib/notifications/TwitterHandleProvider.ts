import { database } from "firebase-admin";
import { Player } from "hive-api";
import * as fetch from 'node-fetch';
import { Config } from '../config/Config';

const namemcUrl = `https://namemc.com/profile/`;

export class TwitterHandleProvider {
  static async get(player: Player){
    if (!player.uuid) {
      await player.info();
    }

    let twitterHandle = await this.getFirebase(player.uuid);

    if (!twitterHandle) {
      twitterHandle = await player.getTwitter();
    }

    if (!twitterHandle) {
      twitterHandle = await this.getNameMc(player.uuid || player.name);
    }

    return twitterHandle;
  }

  private static getNameMc(uuid) {
    return fetch(namemcUrl + uuid)
      .then(res => res.text())
      .then(res => res.match(/(?:href=\"https:\/\/twitter\.com\/)((\w){1,15})(?=\" target)/))
      .then(res => res ? res[1] ? res[1] : null : null)
  }

  private static getFirebase(uuid){
    return Config.get(`twitter.handles.${uuid}`) || null;
  }
}
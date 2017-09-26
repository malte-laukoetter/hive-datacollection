import { database } from "firebase-admin";
import { Player } from "hive-api";
import * as fetch from 'node-fetch';

const namemcUrl = `https://namemc.com/profile/`;

export class TwitterHandleProvider {
  private static _instance: TwitterHandleProvider;
  private ref: admin.database.Reference;

  constructor(ref: admin.database.Reference) {
    this.ref = ref;
    TwitterHandleProvider._instance = this;
  }

  static get instance(): TwitterHandleProvider {
    return TwitterHandleProvider._instance;
  }

  async get(player: Player){
    let twitterHandle = await player.getTwitter();

    if (!twitterHandle) {
      twitterHandle = await this.getNameMc(player.uuid || player.name);
    }

    if(!twitterHandle){
      if(!player.uuid){
        await player.info();
      }

      twitterHandle = await this.getFirebase(player.uuid);
    }

    return twitterHandle;
  }

  private getNameMc(uuid) {
    return fetch(namemcUrl + uuid)
      .then(res => res.text())
      .then(res => res.match(/(?:href=\"https:\/\/twitter\.com\/)((\w){1,15})(?=\" target)/))
      .then(res => res ? res[1] ? res[1] : null : null)
  }

  private getFirebase(uuid){
    return this.ref.child(uuid).once('value').then(snap => snap.val());
  }
}
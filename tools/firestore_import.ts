import { GameTypes } from "hive-api";
import { initializeApp, credential, firestore } from "firebase-admin";

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

const fireStore = firestore();

const data = require('../data.json');

console.log("Importing Firestore GameLeaderboard data from data.json")

const importList = [
]

Object.entries(data).map(([key, obj]) => {
  console.log("Importing: ", key)
  if(importList.map(a => a.id).indexOf(key) == -1) {
    const batch = fireStore.batch();
    const col = fireStore.collection("gameLeaderboards").doc(key).collection("data");

    let i = 0;

    Object.entries(obj).map(([key, obj]) => {
      console.log(key);
      i++;
      return batch.create(col.doc(key), obj)
    });

    console.log(i);

    return batch.commit().then(res => console.log(res)).catch(err => console.error(err));
  }

});
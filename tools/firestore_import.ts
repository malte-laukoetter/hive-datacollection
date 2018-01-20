import { GameTypes } from "hive-api";
import { initializeApp, credential, firestore } from "firebase-admin";
import { compressToBase64 } from "lz-string";

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

const importList = ['HERO',
  'DR',
  'SP',
  'BP',
  'SG',
  'HB',
  'CR',
  'OITC',
  'HIDE',
  'SKY',
  'MIMV',
  'SLAP',
  'TIMV',
  'CAI',
/*  'SGN',
  'DRAW',
  'GRAV',
  'MM',
  'GNT',
  'EF',
  'LAB',
  'SPL',
  'GNTM',
  'RR',
  'BD',
  'PMK',
  'SURV',*/
/*'BED'*/]

async function main(){
  for (let [key, obj] of Object.entries(data)) {
    if (importList.map(a => a).indexOf(key) != -1) {
      console.log("Importing from GameMode: ", key)
      const batch = fireStore.batch();
      const col = fireStore.collection("gameLeaderboards").doc(key).collection("data");

      let i = 0;

      Object.entries(obj).map(([key, obj]) => {
        i++;
        return batch.set(col.doc(key), { a: Buffer.from(compressToBase64(JSON.stringify(obj.data)), 'base64') })
      });

      console.log(`${i} Elements to import`);

      await batch.commit().then(res => console.log(`${res.length} successfull writes (write time: ${res[0].writeTime})`)).catch(err => console.error(err));
    }
  }
}

main();

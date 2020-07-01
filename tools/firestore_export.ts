import { GameTypes } from "hive-api";
import { writeFile } from "fs";
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

async function main() {
  console.log("Exporting Firestore GameLeaderboard data to data.json")

  const obj: any = {};
  
  Promise.all( [
        GameTypes.BP,
        GameTypes.DR,
        GameTypes.HIDE,
        GameTypes.SP,
        GameTypes.TIMV,
        GameTypes.SKY,
        GameTypes.DRAW,
        GameTypes.GRAV,
        GameTypes.BED,
      ]
    .map(gm => {
      return {
        id: gm.id,
        data: fireStore.collection("gameLeaderboards").doc(gm.id).collection("data")
          .get()
          .then(query => query.docs)
          .then(docs => docs.reduce((obj, doc) => {
            obj[doc.id] = doc.data();
            return obj;
          }, {}))
      }
    }).map(async data => {

      obj[data.id] = await data.data;

      return;
    }))
    .then(() => 
      writeFile("./data.json", JSON.stringify(obj), (err) => {
        if(err){
          console.log(err);
        }else{
          console.log("Exported to data.json");
        }
      })
    );
}

main()
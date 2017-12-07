import { toISODateString } from "./utils";
import { Firestore } from "@google-cloud/firestore";


export function converter_playerstats_realtimedb_to_firestore(fireStore: Firestore, a){
  const dataRef = fireStore.collection("players");

  const reduceStatsToObj = (obj, [date, val]) => {
    obj[toISODateString(new Date(parseInt(date)))] = val;

    return obj;
  }

  Object.entries(a).forEach(([uuid, data]) => {
    const playerRef = dataRef.doc(uuid);
    const statsCollection = playerRef.collection("stats");

    const medals = Object.entries(data.medals).reduce(reduceStatsToObj, {});
    statsCollection.doc("medals").set(medals);

    const tokens = Object.entries(data.tokens).reduce(reduceStatsToObj, {});
    statsCollection.doc("tokens").set(tokens);

    Object.entries(data.achievements).map(([key, val]) => {
      const achievements = Object.entries(val).reduce(reduceStatsToObj, {});
      statsCollection.doc(`achievements_${key}`).set(achievements);
    });

    Object.entries(data.points).map(([key, val]) => {
      const points = Object.entries(val).reduce(reduceStatsToObj, {});
      statsCollection.doc(`points_${key}`).set(points);
    });

    playerRef.set({
      total_points: Object.entries(data.points.total).sort(([key, val], [key2, val2]) => parseInt(key2) - parseInt(key))[0][1],
      points: Object.entries(data.points)
        .filter(([key, val]) => key != 'total')
        .reduce((obj, [key, val]) => {
          obj[key] = Object.entries(data.points[key]).sort(([key, val], [key2, val2]) => parseInt(key2) - parseInt(key))[0][1];
          return obj;
        }, {}),
      total_achivements: Object.entries(data.achievements.total).sort(([key, val], [key2, val2]) => parseInt(key2) - parseInt(key))[0][1],
      achievements: Object.entries(data.achievements)
        .filter(([key, val]) => key != 'total')
        .reduce((obj, [key, val]) => {
          obj[key] = Object.entries(data.achievements[key]).sort(([key, val], [key2, val2]) => parseInt(key2) - parseInt(key))[0][1];
          return obj;
        }, {}),
    }, { merge: true });
  });
}

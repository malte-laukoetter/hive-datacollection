import * as admin from "firebase-admin"

export abstract class Updater {
    protected _ref: admin.database.Reference;

    constructor(ref: admin.database.Reference){
        this._ref = ref;
    }

    abstract async start();

    static sendError(err, info) {
        if (err.name === "FetchError") {
            console.error(`Error Response from Hive: ${info}`)
        } else {
            console.error(`error while updating ${info}: ${err.message}`)
        }
    }
}
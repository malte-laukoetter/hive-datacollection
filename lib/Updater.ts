import * as admin from "firebase-admin"

export abstract class Updater {
    protected _ref: admin.database.Reference;

    constructor(ref: admin.database.Reference){
        this._ref = ref;
    }

    abstract async start();
}
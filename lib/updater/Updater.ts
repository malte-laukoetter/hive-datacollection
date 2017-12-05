export abstract class Updater {
    abstract async start();

    static sendError(err, info) {
        if (err.name === "FetchError") {
            console.error(`Error Response from Hive: ${info}`)
        } else {
            console.error(`error while updating ${info}`, err)
        }
    }
}
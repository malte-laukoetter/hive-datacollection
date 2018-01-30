import { Updater } from "./Updater";

export abstract class BasicUpdater extends Updater {
  start(){
    this.eachInterval(this.updateInfo);

    return;
  }

  abstract updateInfo();
}
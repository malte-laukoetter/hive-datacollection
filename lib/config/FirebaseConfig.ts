import { Config } from './Config'

export class FirebaseConfig extends Config {
  private _ref: admin.database.Reference;

  constructor(ref) {
    super();
    this._ref = ref;
  }

  async get(path) {
    return this._ref.child(FirebaseConfig.toFirebasePath(path)).once("value").then(snap => snap.val());
  }

  on(path, event, func) {
    this._ref.child(FirebaseConfig.toFirebasePath(path)).on(event, snap => {
      func(snap.val(), snap.key);
    });
  };

  static toFirebasePath(path) {
    return Config.splitPath(path).join("/");
  }
}
export enum ConfigEventType {
  VALUE = "value",
  CHILD_ADDED = "child_added",
  CHILD_CHANGED = "child_changed",
  CHILD_REMOVED = "child_removed",
  CHILD_MOVED = "child_moved"
}

export abstract class Config {
  private static _instance: Config = null;

  protected constructor() {
    if (Config._instance) {
      throw new Error("There can only be one instance of Config!");
    }

    Config._instance = this;
  }

  static get instance(): Config {
    return Config._instance;
  }

  /**
   * gets the value from the configuration
   * @param path path as a string eather splited by . or / use Config.splitPath() to get an array of path elements
   */
  abstract async get(path): Promise<any>;
  static get(path): Promise<any> {
    return this.instance.get(path);
  }

  static async has(path): Promise<Boolean> {
    return (await Config.get(path)) !== null;
  }

  abstract on(path: string, type: ConfigEventType, func: Function);
  static on(path: string, type: ConfigEventType, func: Function) {
    return this.instance.on(path, type, func);
  }

  protected static splitPath(path) {
    return path
      // split add . and /
      .split(/(\/|\.)/g)
      // filter to only include the even elements (0, 2, 4, ...) to not have the . and /
      .filter((e, i) => i % 2 === 0);
  }
}
import {Config, EventType} from './Config'

export class JsonConfig extends Config {
  private _json = {};

  constructor(json) {
    super();
    this._json = json;
  }

  async get(path): Promise<any> {
    const pathParts = Config.splitPath(path);
    let res = this._json;


    for (let pathPart of pathParts) {
      res = res[pathPart];
    }

    return res;
  }

  on(path, event, func) {
    switch (event) {
      case EventType.VALUE:
        this.get(path).then(val => func(val));
        break;
      case EventType.CHILD_ADDED:
        this.get(path).then(arr => arr.map(val => func(val)));
        break;
    }
  }
}
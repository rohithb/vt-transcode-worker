export default class Config {
  private store: Record<string, any> = {};
  constructor(config: Record<string, any>) {
    this.store = config;
  }

  public get(key: string, defaultValue?: any) {
    if (key === null || key === undefined) {
      throw new Error("Calling config.get with null or undefined argument");
    }
    const value = this.recLookup(this.store, key);
    if (value === undefined) {
      if (defaultValue === undefined) throw new Error('Configuration property "' + key + '" is not defined');
      return defaultValue;
    }
    return value;
  }

  public set(path: string, value: any) {
    var schema = this.store; // a moving reference to internal objects within obj
    var pList = path.split(".");
    var len = pList.length;
    for (var i = 0; i < len - 1; i++) {
      var elem = pList[i];
      if (!schema[elem]) schema[elem] = {};
      schema = schema[elem];
    }
    schema[pList[len - 1]] = value;
  }

  private recLookup(obj: any, path: string): any {
    const parts = path.split(".");
    if (parts.length == 1) {
      return obj[parts[0]];
    }
    return this.recLookup(obj[parts[0]], parts.slice(1).join("."));
  }
}

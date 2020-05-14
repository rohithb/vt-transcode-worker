export default class Config {
  private store: Record<string, any> = {};
  constructor(config: Record<string, any>) {
    this.store = config;
  }

  public get(key: string, defaultValue?: any) {
    if (key === null || key === undefined) {
      throw new Error("Calling config.get with null or undefined argument");
    }
    const value = this.store[key];
    if (value === undefined) {
      if (defaultValue === undefined) throw new Error('Configuration property "' + key + '" is not defined');
      return defaultValue;
    }
    return value;
  }
}

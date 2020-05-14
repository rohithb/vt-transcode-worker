import { IConfig } from "config";
import { singleton, injectable } from "tsyringe";

@singleton()
@injectable()
export default class Config {
  private config: IConfig;
  constructor() {
    this.config = require("config");
  }

  /**
   * Get the value from the configuration
   * @param key
   * @param defaultVaule default value incase the value is not present
   * @throws Error when the key is not present and defaultValue is not given
   */
  public get(key: string, defaultVaule?: any): any {
    let value: any;
    try {
      return this.config.get(key);
    } catch (e) {
      if (defaultVaule === undefined) {
        throw e;
      }
      return defaultVaule;
    }
  }
}

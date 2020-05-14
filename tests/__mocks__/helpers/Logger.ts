import winston from "winston";

export default class LoggerMock {
  public log!: winston.LogMethod;
  public error!: winston.LeveledLogMethod;
  public warn!: winston.LeveledLogMethod;
  public info!: winston.LeveledLogMethod;
  public debug!: winston.LeveledLogMethod;

  constructor() {
    this.log = jest.fn();
    this.error = jest.fn();
    this.warn = jest.fn();
    this.info = jest.fn();
    this.debug = jest.fn();
  }
}

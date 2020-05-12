import { singleton, injectable } from "tsyringe";
import { createLogger, format, transports, Logger as IWinstonLogger } from "winston";

@singleton()
@injectable()
export default class Logger {
  public _logger: IWinstonLogger;

  constructor() {
    this._logger = createLogger({
      level: "info",
      format: format.combine(
        format.timestamp({
          format: "YYYY-MM-DD HH:mm:ss",
        }),
        format.errors({ stack: true }),
        format.splat(),
        format.json()
      ),
      defaultMeta: { service: "transcode-worker" },
      transports: [
        // - Write to all logs with level `info` and below to `transcode-wroker-combined.log`.
        // - Write all logs warn (and below) to `transcode-wroker-error.log`.
        // TODO: finalize the location of the log files or
        // TODO: Async logging
        new transports.File({ filename: "./logs/transcode-wroker-error.log", level: "warn" }),
        new transports.File({ filename: "./logs/transcode-wroker-combined.log", level: "info" }),
      ],
      exitOnError: false,
    });

    //
    // If we're  in development then **ALSO** log to the `console`
    // with the colorized simple format.
    //
    if (process.env.NODE_ENV === "development") {
      this._logger.add(
        new transports.Console({
          format: format.combine(format.colorize(), format.simple()),
          level: "debug",
        })
      );
    }
  }

  get log() {
    return this._logger.log.bind(this._logger);
  }
  get error() {
    return this._logger.error.bind(this._logger);
  }
  get warn() {
    return this._logger.warn.bind(this._logger);
  }
  get info() {
    return this._logger.info.bind(this._logger);
  }
  get debug() {
    return this._logger.debug.bind(this._logger);
  }
}

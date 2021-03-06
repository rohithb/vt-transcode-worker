import { singleton, injectable, container } from "tsyringe";
import FileUtils from "./utils/File";
import Config from "./helpers/Config";
import Logger from "./helpers/Logger";
import amqp from "amqplib";
import { ec, ic } from "./constants/logging";
import Transcode from "./services/Transcode";
import Amqp from "./helpers/Amqp";
import { AMQP_INPUT_ASSET_QUEUE } from "./constants/config";
import { TranscodeWorkerInput } from "./interfaces";
import Validator from "./utils/Validator";

@singleton()
@injectable()
export default class App {
  private fileUtils: FileUtils;
  private config: Config;
  private logger: Logger;
  private transcodeService: Transcode;
  private amqp: Amqp;
  private validator: Validator;

  constructor(
    fileUtils: FileUtils,
    config: Config,
    logger: Logger,
    transcodeService: Transcode,
    amqp: Amqp,
    validator: Validator
  ) {
    this.fileUtils = fileUtils;
    this.config = config;
    this.logger = logger;
    this.transcodeService = transcodeService;
    this.amqp = amqp;
    this.validator = validator;
  }

  start() {
    this.fileUtils.ensureInputAndOutputPathExists();
    this.logger.info(ic.transcode_worker_started, { code: ic.transcode_worker_started });
    return this.amqp.consumeMessage(this.config.get(AMQP_INPUT_ASSET_QUEUE), this.consumer);
  }

  private async consumer(msg: amqp.ConsumeMessage) {
    try {
      // Reference to `this` will not work here, since this function is executed by amqp lib
      const transcodeService = container.resolve<Transcode>(Transcode);
      const request = JSON.parse(msg.content.toString());
      // if (this.validator.validateSchema(schema.remoteFile, request) === false) {
      //   // TODO: handle error more gracefully
      //   throw new Error("Invalid remote file object received");
      // }
      const transcodeWorkerInput = <TranscodeWorkerInput>request;
      await transcodeService.transcodeInputAssetAndUploadToObjectStore(transcodeWorkerInput);
    } catch (err) {
      const logger = container.resolve<Logger>(Logger);
      logger.error(err, { code: ec.amqp_invalid_message, msg: msg.content.toString() });
      throw err;
    }
  }
}

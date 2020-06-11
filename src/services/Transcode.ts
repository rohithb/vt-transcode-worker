import { singleton, injectable } from "tsyringe";
import B2FileManager from "@/helpers/B2FileManager";
import Config from "@/helpers/Config";
import { RemoteFile, TranscodeMediaRequest, UploadTranscodedMediaResponse, TranscodeWorkerInput } from "@/interfaces";
import { ASSETS_BASE_PATH } from "@/constants/config";
import Logger from "@/helpers/Logger";
import { ic } from "@/constants/logging";
import Transcoder from "@/helpers/Transcoder";
import FileUtils from "@/utils/File";

@singleton()
@injectable()
export default class Transcode {
  private b2FileManager: B2FileManager;
  private config: Config;
  private logger: Logger;
  private transcoder: Transcoder;
  private fileUtils: FileUtils;

  constructor(
    b2FileManager: B2FileManager,
    config: Config,
    logger: Logger,
    transcoder: Transcoder,
    fileUtils: FileUtils
  ) {
    this.b2FileManager = b2FileManager;
    this.config = config;
    this.logger = logger;
    this.transcoder = transcoder;
    this.fileUtils = fileUtils;
  }

  /**
   * Downloads the input asset from remote source trancode and create manifest files
   * and upload back to the output location
   * @param remoteFile
   */
  public async transcodeInputAssetAndUploadToObjectStore(
    request: TranscodeWorkerInput
  ): Promise<UploadTranscodedMediaResponse> {
    // TODO: instead of providing the exact resolution, if nothing is given, identify max bitrate,
    // resolution etc and transcode to standard hd480, 360 etc as required.
    const requestId = request.requestId;
    const startTimestamp = (Date.now() / 1000) | 0;
    this.logger.info(ic.request_received_start_processing, { code: ic.request_received_start_processing, requestId });

    const inputAssetPath = await this.b2FileManager
      .download(request.inputFile, this.config.get(ASSETS_BASE_PATH))
      .catch((err) => {
        throw err;
      });

    const trancodeMediaRequest: TranscodeMediaRequest = {
      requestId,
      inputAssetPath,
      transcodeConfig: request.transcodeConfig,
    };
    const transcodedMedia = await this.transcoder.transcodeMedia(trancodeMediaRequest);

    const uploadedTranscodedMedia = await this.b2FileManager.uploadTranscodedMedia(transcodedMedia);

    this.fileUtils.deleteFilesAndFolders(
      [inputAssetPath, this.fileUtils.getOutputPath(trancodeMediaRequest)],
      requestId
    );
    const endTimestamp = (Date.now() / 1000) | 0;
    this.logger.info(ic.request_completed_processing, {
      code: ic.request_completed_processing,
      requestId,
      uploadedTranscodedMedia,
      timeTaken: endTimestamp - startTimestamp,
    });
    return uploadedTranscodedMedia;
  }
}

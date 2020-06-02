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
    const requestId = request.requestId;
    this.logger.info(ic.request_received_start_processing, { code: ic.request_received_start_processing, requestId });
    const inputAssetPath = await this.b2FileManager.download(
      request.inputRemoteFile,
      this.config.get(ASSETS_BASE_PATH)
    );
    const trancodeMediaRequest: TranscodeMediaRequest = {
      requestId,
      inputAssetPath,
      transcodeConfig: request.transcodeConfig,
    };
    const transcodedMedia = await this.transcoder.transcodeMedia(trancodeMediaRequest);
    const remoteTranscodedAssets = await this.b2FileManager.uploadTranscodedMedia(transcodedMedia);
    this.fileUtils.deleteFiles([inputAssetPath, transcodedMedia.manifest, transcodedMedia.mediaSegment], requestId);
    this.logger.info(ic.request_completed_processing, { code: ic.request_completed_processing, requestId });
    return remoteTranscodedAssets;
  }
}

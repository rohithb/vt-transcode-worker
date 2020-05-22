import ffmpeg, { FfmpegCommand } from "fluent-ffmpeg";
import { TranscodedMedia, TranscoderRequest, TranscodeMediaRequest } from "../interfaces";
import { injectable, container } from "tsyringe";
import FileUtils from "../utils/File";
import Logger from "./Logger";
import { ic, ec } from "@/constants/logging";

@injectable()
export default class Transcoder {
  private fileUtils: FileUtils;
  private logger: Logger;

  constructor(fileUtils: FileUtils, logger: Logger) {
    this.fileUtils = fileUtils;
    this.logger = logger;
  }

  /**
   * Transcodes the media file in the input location and returns the path
   * @param input
   */
  private async transcode(request: TranscoderRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      const command = ffmpeg()
        .input(request.inputAssetPath)
        .addOption("-hls_time", "10")
        .addOption("-hls_list_size", "0")
        .addOption("-hls_playlist_type", "vod")
        .addOption("-hls_segment_filename", request.output.mediaSegment)
        .addOption("-hls_flags", "single_file")
        // setup event handlers
        .on("end", function () {
          resolve();
        })
        .on("error", function (err) {
          reject(err);
        })
        // save to file
        .save(request.output.manifest);
    });
  }

  /**
   * Transcodes the input file for creating HLS stream
   * @param request
   */
  public async transcodeMedia(request: TranscodeMediaRequest): Promise<TranscodedMedia> {
    const transcoderRequest = <TranscoderRequest>{
      requestId: request.requestId,
      inputAssetPath: request.inputAssetPath,
    };
    transcoderRequest.output = <TranscodedMedia>{
      requestId: request.requestId,
      manifest: this.fileUtils.getOutputManifestPath(request),
      mediaSegment: this.fileUtils.getOutputSegmentPath(request),
    };
    try {
      await this.transcode(transcoderRequest);
      this.logger.info(ic.transcode_completed, {
        code: ic.transcode_completed,
        requestId: transcoderRequest.requestId,
        transcodedMedia: transcoderRequest.output,
      });
      return transcoderRequest.output;
    } catch (err) {
      this.logger.error(err, {
        code: ec.failed_to_trancode_input_asset,
        requestId: transcoderRequest.requestId,
        transcodeRequest: request,
      });
      throw err;
    }
  }
}

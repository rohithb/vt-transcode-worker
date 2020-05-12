import ffmpeg, { FfmpegCommand } from "fluent-ffmpeg";
import { TranscodedMedia, TranscoderRequest, TranscodeMediaRequest } from "./interfaces";
import FileHandler from "./FileHandler";

export default class Transcoder {
  private command: FfmpegCommand;

  constructor() {
    this.command = ffmpeg();
  }

  /**
   * Transcodes the media file in the input location and returns the path
   * @param input
   */
  private async transcode(request: TranscoderRequest): Promise<void> {
    return new Promise((resolve, reject) => {
      this.command
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
      manifest: FileHandler.getOutputManifestPath(request),
      mediaSegment: FileHandler.getOutputSegmentPath(request),
    };
    await this.transcode(transcoderRequest);
    return transcoderRequest.output;
  }
}

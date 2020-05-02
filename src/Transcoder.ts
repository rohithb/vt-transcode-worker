import ffmpeg, { FfmpegCommand } from "fluent-ffmpeg";
import { TranscodedMedia, TranscoderRequest, TranscodeMediaRequest } from "types";
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
  private transcode(request: TranscoderRequest): void {
    this.command
      .input(request.inputAssetPath)
      .addOption("-hls_time", "10")
      .addOption("-hls_list_size", "0")
      .addOption("-hls_playlist_type", "vod")
      .addOption("-hls_segment_filename", request.output.mediaSegment)
      .addOption("-hls_flags", "single_file")
      // setup event handlers
      .on("end", function () {
        console.log("file has been converted succesfully");
      })
      .on("error", function (err) {
        console.log(err);

        console.log("an error happened: " + err.message);
      })
      // save to file
      .save(request.output.manifest);
  }

  /**
   * Transcodes the input file for creating HLS stream
   * @param request
   */
  public transcodeMedia(request: TranscodeMediaRequest): TranscodedMedia {
    const transcoderRequest = <TranscoderRequest>{
      id: request.id,
      inputAssetPath: request.inputAssetPath,
    };
    transcoderRequest.output = <TranscodedMedia>{
      manifest: FileHandler.getOutputManifestPath(request),
      mediaSegment: FileHandler.getOutputSegmentPath(request),
    };
    this.transcode(transcoderRequest);
    return transcoderRequest.output;
  }
}

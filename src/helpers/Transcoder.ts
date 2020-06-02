import ffmpeg, { FfmpegCommand } from "fluent-ffmpeg";
import {
  TranscodedMedia,
  TranscoderRequest,
  TranscodeMediaRequest,
  TranscodeConfig,
  FFmpegPreset,
} from "../interfaces";
import { injectable, container } from "tsyringe";
import FileUtils from "../utils/File";
import Logger from "./Logger";
import { ic, ec } from "@/constants/logging";
import FfmpegUtils from "@/utils/Ffmpeg";
import {
  BITRATE_MULTIPLIER,
  BUFFER_SIZE_MULTIPLIER,
  OUTPUT_VARIANT_PLAYLIST_PREFIX,
  OUTPUT_SEGMENT_PREFIX,
  OUTPUT_MASTER_PLAYLIST_NAME,
} from "@/constants/others";

@injectable()
export default class Transcoder {
  private fileUtils: FileUtils;
  private logger: Logger;
  private ffmpegUtils: FfmpegUtils;

  constructor(fileUtils: FileUtils, logger: Logger, ffmpegUtils: FfmpegUtils) {
    this.fileUtils = fileUtils;
    this.logger = logger;
    this.ffmpegUtils = ffmpegUtils;
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

  private getDefaultTranscodeConfig(): TranscodeConfig {
    return <TranscodeConfig>{
      renditions: [],
      preset: FFmpegPreset.VeryFast,
      videoCodec: "libx264",
      audioCodec: "aac",
      segmentDuration: 6,
    };
  }

  private async transcode2(
    src: string,
    targetDir: string,
    transcodeConfig: Partial<TranscodeConfig> = {}
  ): Promise<void> {
    const defaultSettings = this.getDefaultTranscodeConfig();
    // Merge settings with default settings.
    const config = <TranscodeConfig>{
      ...defaultSettings,
      ...transcodeConfig,
    };

    if (!config.renditions || config.renditions.length === 0) {
      const err: any = new Error("At least one rendition is required in the transcode config");
      this.logger.error(err, { code: ec.transcoder_no_rendition_present });
      throw err;
    }

    config.renditions = config.renditions.sort((a, b) => a.resolution.height - b.resolution.height);

    const srcMetadata = await this.ffmpegUtils.getMetaData(src);
    const videoStreamMetadata = srcMetadata.streams.find((s) => s.codec_type === "video");

    if (!videoStreamMetadata) {
      throw new Error("There was a problem to extract video stream metadata");
    }

    const keyFramesInterval = this.ffmpegUtils.getFrameRate(videoStreamMetadata) * 2; // 1 in every 2 second

    let ffmpegCommand: FfmpegCommand = ffmpeg(src).addInputOption("-hide_banner -y");

    let masterPlaylistData = "#EXTM3U\n#EXT-X-VERSION:3\n";

    config.renditions.forEach((rendition) => {
      // Ref: https://trac.ffmpeg.org/wiki/EncodingForStreamingSites
      const maxrate = rendition.videoBitRate * BITRATE_MULTIPLIER;
      const bufsize = rendition.videoBitRate * BUFFER_SIZE_MULTIPLIER;
      const bandwidth = `${rendition.videoBitRate}000`;
      const playlistName = `${OUTPUT_VARIANT_PLAYLIST_PREFIX}_${rendition.resolution.height}p.m3u8`;
      const segmentName = `${OUTPUT_SEGMENT_PREFIX}_${rendition.resolution.height}p.ts`;

      ffmpegCommand = ffmpegCommand
        .addOutput(`${targetDir}/${playlistName}`)
        // @ts-ignore
        .videoCodec(config.videoCodec)
        .videoBitrate(rendition.videoBitRate)
        .audioCodec(config.audioCodec)
        .audioBitrate(rendition.audioBitRate)
        .addOutputOptions([
          `-maxrate ${maxrate}k`, // Video options ↓
          `-bufsize ${bufsize}k`,
          `-vf scale=w=${rendition.resolution.width}:h=${rendition.resolution.height}:force_original_aspect_ratio=decrease`, // Video output option.
          `-preset ${config.preset}`,
          "-sc_threshold 0",
          `-g ${keyFramesInterval}`,
          `-keyint_min ${keyFramesInterval}`,
          `-hls_time ${config.segmentDuration}`, // HLS options ↓
          "-hls_playlist_type vod",
          "-hls_flags single_file",
          `-hls_segment_filename ${targetDir}/${segmentName}`,
        ]);

      // Add rendition entry in the master playlist.
      masterPlaylistData += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${rendition.resolution.width}x${rendition.resolution.height}\n${playlistName}\n`;
    });
    await this.ffmpegUtils.runCommand(ffmpegCommand);

    // Create master playlist file.
    await this.fileUtils.createFile(`${targetDir}/${OUTPUT_MASTER_PLAYLIST_NAME}`, masterPlaylistData);
  }

  /**
   * Transcodes the input file for creating HLS stream
   * @param request
   */
  public async transcodeMedia(request: TranscodeMediaRequest): Promise<TranscodedMedia> {
    const output = <TranscodedMedia>{
      requestId: request.requestId,
      // manifest: this.fileUtils.getOutputManifestPathPrefix(request),
      // mediaSegment: this.fileUtils.getOutputSegmentPathPrefix(request),
    };
    const transcoderRequest = <TranscoderRequest>{ ...request, output };
    try {
      const outputPath = this.fileUtils.getOutputPath(transcoderRequest);
      await this.transcode2(request.inputAssetPath, outputPath, request.transcodeConfig);
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

import ffmpeg, { FfmpegCommand } from "fluent-ffmpeg";
import {
  TranscodedMedia,
  TranscoderRequest,
  TranscodeMediaRequest,
  TranscodeConfig,
  FFmpegPreset,
  Variant,
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

  private getDefaultTranscodeConfig(): TranscodeConfig {
    return <TranscodeConfig>{
      renditions: [],
      preset: FFmpegPreset.VeryFast,
      videoCodec: "libx264",
      audioCodec: "aac",
      segmentDuration: 6,
    };
  }

  /**
   * Transcode the input asset based on the transcode configuration provided
   * @param req TranscodeRequest
   */
  private async transcode(req: TranscoderRequest): Promise<TranscodedMedia> {
    const defaultSettings = this.getDefaultTranscodeConfig();
    // Merge settings with default settings.
    const config = <TranscodeConfig>{
      ...defaultSettings,
      ...req.transcodeConfig,
    };

    if (!config.renditions || config.renditions.length === 0) {
      const err: any = new Error("At least one rendition is required in the transcode config");
      this.logger.error(err, { code: ec.transcoder_no_rendition_present });
      throw err;
    }

    config.renditions = config.renditions.sort((a, b) => a.resolution.height - b.resolution.height);

    const frameRate = await this.ffmpegUtils.getFrameRate(req.inputAssetPath, req.requestId).catch((err) => {
      this.logger.error(err, { code: ec.transcoder_cannot_extract_src_frame_rate, requestId: req.requestId });
      throw err;
    });
    const keyFramesInterval = frameRate * 2; // 1 in every 2 second

    let ffmpegCommand: FfmpegCommand = ffmpeg({
      source: req.inputAssetPath,
      logger: this.logger,
    }).addInputOption("-hide_banner -y");

    const output = <TranscodedMedia>{
      requestId: req.requestId,
      variants: [] as Variant[],
    };

    let masterPlaylistData = "#EXTM3U\n#EXT-X-VERSION:3\n";

    config.renditions.forEach((rendition) => {
      // Ref: https://trac.ffmpeg.org/wiki/EncodingForStreamingSites
      const maxrate = rendition.videoBitRate * BITRATE_MULTIPLIER;
      const bufsize = rendition.videoBitRate * BUFFER_SIZE_MULTIPLIER;
      const bandwidth = `${rendition.videoBitRate}000`;
      const playlistName = `${OUTPUT_VARIANT_PLAYLIST_PREFIX}_${rendition.resolution.height}p.m3u8`;
      const segmentName = `${OUTPUT_SEGMENT_PREFIX}_${rendition.resolution.height}p.ts`;

      output.variants.push(<Variant>{
        playlist: `${req.outputDir}/${playlistName}`,
        mediaSegment: `${req.outputDir}/${segmentName}`,
        resolution: rendition.resolution,
      });

      ffmpegCommand = ffmpegCommand
        .addOutput(`${req.outputDir}/${playlistName}`)
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
          `-hls_segment_filename ${req.outputDir}/${segmentName}`,
          /**
           * add padding to make the video resolution an even number, since h.264 requires it
           * https://ffmpeg.org/ffmpeg-filters.html#pad
           * https://stackoverflow.com/a/20848224/1771949
           */
          `-vf pad=ceil(iw/2)*2:ceil(ih/2)*2`,
        ]);

      // Add rendition entry in the master playlist.
      masterPlaylistData += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth},RESOLUTION=${rendition.resolution.width}x${rendition.resolution.height}\n${playlistName}\n`;
    });
    await this.ffmpegUtils.runCommand(ffmpegCommand, req.requestId);

    // Create master playlist file.
    await this.fileUtils.createFile(`${req.outputDir}/${OUTPUT_MASTER_PLAYLIST_NAME}`, masterPlaylistData);

    output.masterPlaylist = `${req.outputDir}/${OUTPUT_MASTER_PLAYLIST_NAME}`;
    return output;
  }

  /**
   * Transcodes the input file for creating HLS stream
   * @param request
   */
  public async transcodeMedia(request: TranscodeMediaRequest): Promise<TranscodedMedia> {
    const transcoderRequest = <TranscoderRequest>{
      ...request,
      outputDir: this.fileUtils.getOutputPath(request),
    };
    try {
      const transcodedMedia = await this.transcode(transcoderRequest);

      this.logger.info(ic.transcoder_transcode_completed, {
        code: ic.transcoder_transcode_completed,
        requestId: transcoderRequest.requestId,
        transcodedMedia,
      });
      return transcodedMedia;
    } catch (err) {
      this.logger.error(err, {
        code: ec.transcoder_failed_to_transcode_asset,
        requestId: transcoderRequest.requestId,
        transcodeRequest: request,
      });
      throw err;
    }
  }
}

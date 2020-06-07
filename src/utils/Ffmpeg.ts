import { injectable, singleton } from "tsyringe";
import Logger from "@/helpers/Logger";
import { FfmpegCommand, FfprobeStream, FfprobeData, ffprobe } from "fluent-ffmpeg";
import { ec, ic } from "@/constants/logging";

@singleton()
@injectable()
export default class Ffmpeg {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Executes a ffmpeg command
   * @param ffmpegCommand
   */
  public async runCommand(ffmpegCommand: FfmpegCommand, requestId?: string) {
    const logs: string[] = [];
    return new Promise((resolve, reject) => {
      ffmpegCommand.on("error", (err) => {
        this.logger.error(logs.join("\n"), { code: ec.ffmpeg_error, requestId });
        reject(err);
      });

      ffmpegCommand.on("stderr", (stderrLine) => {
        logs.push(stderrLine);
      });

      ffmpegCommand.on("end", () => {
        this.logger.info(logs.join("\n"), { code: ic.ffmpeg_info, requestId });
        resolve();
      });

      ffmpegCommand.run();
    });
  }

  /**
   * Returns the frame rate of a given source video
   * @param assetPath
   */
  public async getFrameRate(assetPath: string, requestId?: string): Promise<number> {
    const metaData = await this.getMetaData(assetPath).catch((err) => {
      throw err;
    });
    const videoStreamMetadata = metaData.streams.find((s) => s.codec_type === "video");

    if (!videoStreamMetadata) {
      const err: any = new Error("Could not extract video stream metadata");
      this.logger.error(ec.ffmpeg_utils_cannot_extract_video_meta_data, {
        code: ec.ffmpeg_utils_cannot_extract_video_meta_data,
        metaData,
        requestId,
      });
      throw err;
    }

    if (!videoStreamMetadata.r_frame_rate) {
      const err: any = new Error("r_frame_rate does not exist in FFprobestream");
      this.logger.error(err, { code: ec.ffmpeg_utils_cannot_extract_frame_rate, videoStreamMetadata, requestId });
      throw err;
    }

    return Math.floor(parseInt(videoStreamMetadata.r_frame_rate, 10));
  }

  /**
   * Extract meta data from a video asset using ffprobe
   * @param assetPath
   */
  public async getMetaData(assetPath: string): Promise<FfprobeData> {
    return new Promise((resolve, reject) => {
      ffprobe(assetPath, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata);
        }
      });
    });
  }
}

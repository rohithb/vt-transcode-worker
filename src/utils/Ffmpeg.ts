import { injectable, singleton } from "tsyringe";
import Logger from "@/helpers/Logger";
import { FfmpegCommand, FfprobeStream, FfprobeData, ffprobe } from "fluent-ffmpeg";
import { ec } from "@/constants/logging";

@singleton()
@injectable()
export default class Ffmpeg {
  private logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  public async runCommand(ffmpegCommand: FfmpegCommand) {
    return new Promise((resolve, reject) => {
      ffmpegCommand.on("error", (err) => {
        reject(err);
      });

      ffmpegCommand.on("stderr", (stderrLine) => {
        this.logger.error(stderrLine, { code: ec.ffmpeg_error });
      });

      ffmpegCommand.on("end", () => {
        resolve();
      });

      ffmpegCommand.run();
    });
  }

  public getFrameRate(ffprobeStream: FfprobeStream): number {
    // TODO: error handling
    if (!ffprobeStream.r_frame_rate) {
      throw new Error("r_frame_rate does not exist from ffprobeStream");
    }
    return Math.floor(parseInt(ffprobeStream.r_frame_rate, 10));
  }

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

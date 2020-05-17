import { singleton, injectable } from "tsyringe";
import Logger from "@/helpers/Logger";
import fs from "fs";
import { ASSETS_BASE_PATH, OUTPUT_DIRECTORY } from "@/constants/config";
import { ec } from "@/constants/logging";
import { TranscodeMediaRequest } from "@/interfaces";
import { dirname } from "path";
import Config from "@/helpers/Config";
import { FILE_SEPARATOR, OUTPUT_MANIFEST_NAME, OUTPUT_SEGMENT_NAME } from "@/constants/others";

@singleton()
@injectable()
export default class FileManagementUtils {
  private logger: Logger;
  private config: Config;

  constructor(logger: Logger, config: Config) {
    this.logger = logger;
    this.config = config;
  }

  /**
   * Create the input and output paths if doesn't exists and sets RW permissions
   * To be called once when the worker starts.
   * @param inputPath
   * @param outputDir
   */
  public ensureInputAndOutputPathExists(inputPath: string, outputDir: string): void {
    if (!inputPath) {
      const err: any = new Error(`${ASSETS_BASE_PATH} is not present in the config`);
      this.logger.error(err, { code: ec.config_invalid_asset_base_path, inputPath, outputDir });
    }
    const outputPath = `${inputPath}/${outputDir}`;
    this.createDirWithReadWritePerm(inputPath);
    this.createDirWithReadWritePerm(outputPath);
  }

  /**
   * Create given directory with Read write permission
   * @param path
   */
  private createDirWithReadWritePerm(path: string): void {
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path, {
        recursive: true,
      });
    }
    fs.chmodSync(path, 0o766);
  }

  /**
   * Delets all files specified in the input array
   * @param files
   */
  public deleteFiles(files: string[]) {
    // TODO: add exception handling
    files.forEach((file) => {
      fs.unlinkSync(file);
    });
  }

  /**
   * returns the output manigest path
   * @param transcodeMedia
   */
  public getOutputManifestPath(transcodeMedia: TranscodeMediaRequest): string {
    let outputPath = dirname(transcodeMedia.inputAssetPath);
    outputPath = this.removeFileNameSeparator(outputPath);
    const outputDirectory = this.config.get(OUTPUT_DIRECTORY, "output");
    return `${outputPath}/${outputDirectory}/${transcodeMedia.requestId}${FILE_SEPARATOR}${OUTPUT_MANIFEST_NAME}`;
  }

  /**
   * returns the output media segment path
   * @param transcodeMedia
   */
  public getOutputSegmentPath(transcodeMedia: TranscodeMediaRequest): string {
    let outputPath = dirname(transcodeMedia.inputAssetPath);
    outputPath = this.removeFileNameSeparator(outputPath);
    const outputDirectory = this.config.get(OUTPUT_DIRECTORY, "output");
    return `${outputPath}/${outputDirectory}/${transcodeMedia.requestId}${FILE_SEPARATOR}${OUTPUT_SEGMENT_NAME}`;
  }

  /**
   * We are using 3 underscores (___) for separating filename and directory name while processing
   * This function will replace ___ with _ to avoid duplicate seperator while uploading to b2
   * @param fileName
   */
  private removeFileNameSeparator(fileName: string): string {
    return fileName.replace(new RegExp(FILE_SEPARATOR, "g"), "_");
  }
}

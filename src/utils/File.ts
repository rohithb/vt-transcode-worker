import { singleton, injectable } from "tsyringe";
import Logger from "@/helpers/Logger";
import fs from "fs";
import { ASSETS_BASE_PATH, OUTPUT_DIRECTORY } from "@/constants/config";
import { ec, ic } from "@/constants/logging";
import { TranscodeMediaRequest } from "@/interfaces";
import { dirname } from "path";
import Config from "@/helpers/Config";
// import { OUTPUT_MANIFEST_NAME, OUTPUT_SEGMENT_NAME } from "@/constants/others";

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
   * To be called once when the app starts.
   */
  public ensureInputAndOutputPathExists(): void {
    const inputPath = this.config.get(ASSETS_BASE_PATH);
    const outputDir = this.config.get(OUTPUT_DIRECTORY);
    if (!inputPath) {
      const err: any = new Error(`${ASSETS_BASE_PATH} is not present in the config`);
      this.logger.error(err, { code: ec.config_invalid_asset_base_path, inputPath, outputDir });
      throw err;
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
   * Create a new file and write the given contents to it
   * @param filePath
   * @param content
   */
  public async createFile(filePath: string, content: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, content, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Delets all files specified in the input array
   * @param files
   * @returns boolean true if all the files are deleted. else returns false
   */
  public deleteFiles(files: string[], requestId: string): boolean {
    let isErrorOccured = false;
    files.forEach((file) => {
      try {
        fs.unlinkSync(file);
      } catch (err) {
        this.logger.error(err, { code: ec.file_utils_failed_to_delete_file, file, requestId });
        isErrorOccured = true;
      }
    });
    if (!isErrorOccured) {
      this.logger.info(ic.deleted_working_files, { code: ic.deleted_working_files, requestId, files });
    }
    return !isErrorOccured;
  }

  /**
   * create the output folder and ensure the folder exists with write permissions
   * @param transcodeMedia
   */
  public getOutputPath(transcodeMedia: TranscodeMediaRequest): string {
    let outputPath = dirname(transcodeMedia.inputAssetPath);
    const outputDirectoryName = this.config.get(OUTPUT_DIRECTORY, "output");
    outputPath = `${outputPath}/${outputDirectoryName}/${transcodeMedia.requestId}`;
    this.createDirWithReadWritePerm(outputPath);
    return outputPath;
  }

  /**
   * returns the output manigest path
   * @param transcodeMedia
   */
  // public getOutputManifestPathPrefix(transcodeMedia: TranscodeMediaRequest): string {
  //   const outputPath = this.getOutputPath(transcodeMedia);
  //   return `${outputPath}/${OUTPUT_MANIFEST_NAME}`;
  // }

  /**
   * returns the output media segment path path,
   * @param transcodeMedia
   */
  //   public getOutputSegmentPathPrefix(transcodeMedia: TranscodeMediaRequest): string {
  //     const outputPath = this.getOutputPath(transcodeMedia);
  //     return `${outputPath}/${OUTPUT_SEGMENT_NAME}`;
  //   }
}

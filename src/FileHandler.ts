import { dirname } from "path";
import fs from "fs";
import path from "path";
import { TranscodeMediaRequest, TranscodedMedia, RemoteFile, UploadTranscodedMediaResponse } from "./interfaces";
import BackBlazeB2 from "backblaze-b2";
import { singleton, injectable } from "tsyringe";

@singleton()
@injectable()
class FileHandler {
  private OUTPUT_MANIFEST_NAME: string;
  private OUTPUT_SEGMENT_NAME: string;
  private INPUT_PATH: string;
  private OUTPUT_FOLDER: string;
  private FILE_SEPARATOR: string;

  constructor() {
    this.OUTPUT_MANIFEST_NAME = "palylist.m3u8";
    this.OUTPUT_SEGMENT_NAME = "asset.ts";
    this.INPUT_PATH = process.env.ASSETS_PATH || "";
    this.OUTPUT_FOLDER = process.env.OUTPUT_FOLDER || "output";
    this.FILE_SEPARATOR = "__";
  }

  /**
   * returns the output manigest path
   * @param transcodeMedia
   */
  public getOutputManifestPath(transcodeMedia: TranscodeMediaRequest): string {
    let outputPath = dirname(transcodeMedia.inputAssetPath);
    outputPath = this.removeFileNameSeparator(outputPath);
    return `${outputPath}/${this.OUTPUT_FOLDER}/${transcodeMedia.requestId}${this.FILE_SEPARATOR}${this.OUTPUT_MANIFEST_NAME}`;
  }

  /**
   * returns the output media segment path
   * @param transcodeMedia
   */
  public getOutputSegmentPath(transcodeMedia: TranscodeMediaRequest): string {
    let outputPath = dirname(transcodeMedia.inputAssetPath);
    outputPath = this.removeFileNameSeparator(outputPath);
    return `${outputPath}/${this.OUTPUT_FOLDER}/${transcodeMedia.requestId}${this.FILE_SEPARATOR}${this.OUTPUT_SEGMENT_NAME}`;
  }

  /**
   * We are using 3 underscores (___) for separating filename and directory name while processing
   * This function will replace ___ with _ to avoid duplicate seperator while uploading to b2
   * @param fileName
   */
  private removeFileNameSeparator(fileName: string): string {
    return fileName.replace(new RegExp(this.FILE_SEPARATOR, "g"), "_");
  }



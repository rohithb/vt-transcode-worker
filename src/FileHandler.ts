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

  /**
   * Create the input and output paths if doesn't exists and sets RW permissions
   * To be called once when the worker starts.
   * @param inputPath input assets directory
   */
  public ensureInputAndOutputPathExists(): void {
    if (!this.INPUT_PATH) {
      throw new Error("Env var ASSET_PATH is not found.");
    }
    const outputPath = `${this.INPUT_PATH}/${this.OUTPUT_FOLDER}`;
    this.createDirWithReadWritePerm(this.INPUT_PATH);
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
   * Download a file from backlaze B2
   * @param request
   */
  public async downloadFileFromB2(request: RemoteFile): Promise<string> {
    const b2 = await this.getB2Instance();
    const ext = path.extname(request.fileName);
    const filePath = `${this.INPUT_PATH}/${request.requestId}${ext}`;
    const writer = fs.createWriteStream(filePath);

    const response = await b2.downloadFileById({
      fileId: request.fileId,
      responseType: "stream",
    });
    response.data.pipe(writer);
    // TODO: Do some sanity checks like verifying file size and sha1 etc
    return new Promise((resolve, reject) => {
      writer.on("finish", () => {
        resolve(filePath);
      });
      writer.on("error", reject);
    });
  }

  /**
   * Upload both manifest and media segment to b2
   * @param transcodedMedia
   */
  public async uploadTranscodedMedia(transcodedMedia: TranscodedMedia): Promise<UploadTranscodedMediaResponse> {
    const uploadManifestPromise = this.uploadFileToB2(transcodedMedia.manifest, "application/x-mpegURL");
    const uploadMediaSegmentPromise = this.uploadFileToB2(transcodedMedia.mediaSegment, "video/MP2T");
    return <UploadTranscodedMediaResponse>{
      requestId: transcodedMedia.requestId,
      remoteManifest: await uploadManifestPromise,
      remoteMediaSegment: await uploadMediaSegmentPromise,
    };
  }

  /**
   * Uplaod a single file to B2
   * @param filePath
   * @param mimeType
   */
  private async uploadFileToB2(filePath: string, mimeType: string): Promise<RemoteFile> {
    const b2 = await this.getB2Instance();
    const uploadUrlResponse = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID || "",
    });

    // TODO: convert to large file upload
    const buf = fs.readFileSync(filePath);
    const uploadResponse = await b2.uploadFile({
      uploadUrl: uploadUrlResponse.data.uploadUrl,
      uploadAuthToken: uploadUrlResponse.data.authorizationToken,
      fileName: path.basename(filePath),
      mime: mimeType, // optional mime type, will default to 'b2/x-auto' if not provided
      data: buf, // this is expecting a Buffer, not an encoded string
      onUploadProgress: null,
    });
    return <RemoteFile>{
      contentLength: uploadResponse.data.contentLength,
      contentSha1: uploadResponse.data.contentSha1,
      contentType: uploadResponse.data.contentType,
      fileId: uploadResponse.data.fileId,
      fileName: uploadResponse.data.fileName,
      uploadTimestamp: uploadResponse.data.uploadTimestamp,
    };
  }

  /**
   * Get authorized B2 instance
   */
  private async getB2Instance(): Promise<BackBlazeB2> {
    // TODO: move all envronment variable access to outside this function
    const b2 = new BackBlazeB2({
      applicationKeyId: process.env.B2_KEY_ID || "",
      applicationKey: process.env.B2_APP_KEY || "",
    });
    await b2.authorize();
    return b2;
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
}

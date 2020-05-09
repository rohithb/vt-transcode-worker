import { dirname } from "path";
import { TranscodeMediaRequest, TranscodedMedia, B2Response, UploadTranscodedMediaResponse } from "./types/types";
import BackBlaze from "backblaze-b2";
import fs from "fs";
import path from "path";

export default class FileHandler {
  private static OUTPUT_MANIFEST_NAME = "palylist.m3u8";
  private static OUTPUT_SEGMENT_NAME = "asset.ts";
  private static OUTPUT_FOLDER = process.env.OUTPUT_FOLDER || "output";

  private static FILE_SEPARATOR = "__";
  /**
   * returns the output manigest path
   * @param transcodeMedia
   */
  public static getOutputManifestPath(transcodeMedia: TranscodeMediaRequest): string {
    let outputPath = dirname(transcodeMedia.inputAssetPath);
    outputPath = this.removeFileNameSeparator(outputPath);
    return `${outputPath}/${this.OUTPUT_FOLDER}/${transcodeMedia.id}${this.FILE_SEPARATOR}${this.OUTPUT_MANIFEST_NAME}`;
  }

  /**
   * returns the output media segment path
   * @param transcodeMedia
   */
  public static getOutputSegmentPath(transcodeMedia: TranscodeMediaRequest): string {
    let outputPath = dirname(transcodeMedia.inputAssetPath);
    outputPath = this.removeFileNameSeparator(outputPath);
    return `${outputPath}/${this.OUTPUT_FOLDER}/${transcodeMedia.id}${this.FILE_SEPARATOR}${this.OUTPUT_SEGMENT_NAME}`;
  }

  /**
   * We are using 3 underscores (___) for separating filename and directory name while processing
   * This function will replace ___ with _ to avoid duplicate seperator while uploading to b2
   * @param fileName
   */
  private static removeFileNameSeparator(fileName: string): string {
    return fileName.replace(new RegExp(this.FILE_SEPARATOR, "g"), "_");
  }

  /**
   * Create the input and output paths if doesn't exists and sets RW permissions
   * To be called once when the worker starts.
   * @param inputPath input assets directory
   */
  public static ensureInputAndOutputPathExists(): void {
    const inputPath = process.env.ASSETS_PATH;
    if (!inputPath) {
      throw new Error("Env var ASSET_PATH is not found.");
    }
    const outputPath = `${inputPath}/${this.OUTPUT_FOLDER}`;
    this.createDirWithReadWritePerm(inputPath);
    this.createDirWithReadWritePerm(outputPath);
  }

  /**
   * Create given directory with Read write permission
   * @param path
   */
  private static createDirWithReadWritePerm(path: string): void {
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
  public static async downloadFileFromB2(request: B2Response): Promise<string> {
    const b2 = await this.getB2Instance();
    const ext = path.extname(request.fileName);
    const filePath = `${process.env.ASSETS_PATH}/${request.requestId}${ext}`;
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
  public static async uploadTranscodedMedia(transcodedMedia: TranscodedMedia): Promise<UploadTranscodedMediaResponse> {
    const uploadManifestPromise = this.uploadFileToB2(transcodedMedia.manifest, "application/x-mpegURL");
    const uploadMediaSegmentPromise = this.uploadFileToB2(transcodedMedia.mediaSegment, "video/MP2T");
    return <UploadTranscodedMediaResponse>{
      id: transcodedMedia.id,
      manifestResponse: await uploadManifestPromise,
      mediaSegmentResponse: await uploadMediaSegmentPromise,
    };
  }

  /**
   * Uplaod a single file to B2
   * @param filePath
   * @param mimeType
   */
  private static async uploadFileToB2(filePath: string, mimeType: string): Promise<B2Response> {
    const b2 = await this.getB2Instance();
    const uploadUrlResponse = await b2.getUploadUrl({
      bucketId: process.env.B2_BUCKET_ID,
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
    return <B2Response>{
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
  private static async getB2Instance(): Promise<any> {
    // TODO: move all envronment variable access to outside this function
    const b2 = new BackBlaze({
      applicationKeyId: process.env.B2_KEY_ID,
      applicationKey: process.env.B2_APP_KEY,
    });
    await b2.authorize();
    return b2;
  }

  /**
   * Delets all files specified in the input array
   * @param files
   */
  public static deleteFiles(files: string[]) {
    // TODO: add exception handling
    files.forEach((file) => {
      fs.unlinkSync(file);
    });
  }
}
/**
if (require.main === module) {
  process.env.B2_KEY_ID = "001fc5c469492a20000000005";
  process.env.B2_APP_KEY = "K001+FGt3i7ymAJejyZMLmVCcGN/5wQ";
  process.env.B2_BUCKET_ID = "0f2c35dc44a6d94479120a12";
  const filePath = "/Users/rohithb/Downloads/assets_test/output/abcd123__asset.ts";
  FileHandler.uploadFileToB2(filePath, "video/MP2T");
}
 */

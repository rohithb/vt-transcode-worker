import {
  ObjectStoreManager,
  RemoteFile,
  TranscodeMediaRequest,
  UploadTranscodedMediaResponse,
  TranscodedMedia,
} from "../interfaces";
import { singleton, injectable, container } from "tsyringe";
import path from "path";
import fs from "fs";
import BackBlazeB2 from "backblaze-b2";
import Logger from "./Logger";
import { ic } from "constants/logging";
import Config from "./Config";
import { INPUT_DIRECTORY, B2_BUCKET_ID } from "constants/config";

@singleton()
@injectable()
export default class B2FileManager implements ObjectStoreManager {
  private b2: BackBlazeB2;
  private logger: Logger;
  private config: Config;

  constructor(b2: BackBlazeB2, logger: Logger, config: Config) {
    this.b2 = b2;
    this.logger = logger;
    this.config = config;
  }

  /**
   * Authorize B2 client
   */
  private async authorize() {
    // TODO: avoid authorizing everytime, instead authorize only if current auth is expired or not authorized already.
    await this.b2.authorize();
    this.logger.info(ic.b2_authorized, { code: ic.b2_authorized });
  }

  /**
   * Downlaod the requested file and returns the downloaded asset path
   * @param request
   */
  async download(request: RemoteFile): Promise<string> {
    await this.authorize();
    const filePath = this.getDownloadFilePath(request.fileName, request.requestId);
    const writer = fs.createWriteStream(filePath);
    const response = await this.b2.downloadFileById({
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

  // uploadTranscodedMedia(request: TranscodedMedia): Promise<UploadTranscodedMediaResponse> {
  //   const uploadManifestPromise = this.uploadFileToB2(request.manifest, "application/x-mpegURL");
  //   const uploadMediaSegmentPromise = this.uploadFileToB2(request.mediaSegment, "video/MP2T");
  //   try {
  //     return <UploadTranscodedMediaResponse>{
  //       requestId: request.requestId,
  //       remoteManifest: await uploadManifestPromise,
  //       remoteMediaSegment: await uploadMediaSegmentPromise,
  //     };
  //   } catch (err) {}
  // }

  /**
   * Returns the download file location. => INPUT_DIR/requestID.ext
   * @param fileName
   * @param requestId
   */
  private getDownloadFilePath(fileName: string, requestId: string) {
    const ext = path.extname(fileName);
    return `${this.config.get(INPUT_DIRECTORY)}/${requestId}${ext}`;
  }

  private async uploadFileToB2(filePath: string, mimeType: string): Promise<RemoteFile> {
    const b2 = await this.b2.authorize();
    const uploadUrlResponse = await this.b2.getUploadUrl({
      bucketId: this.config.get(B2_BUCKET_ID, ""),
    });

    // TODO: convert to large file upload
    const buf = fs.readFileSync(filePath);
    const uploadResponse = await this.b2.uploadFile({
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
}

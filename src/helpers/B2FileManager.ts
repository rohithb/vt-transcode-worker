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
import { ic, ec } from "@/constants/logging";
import Config from "./Config";
import { B2_OUTPUT_BUCKET_ID } from "@/constants/config";

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
    try {
      await this.b2.authorize();
      this.logger.info(ic.b2_authorized, { code: ic.b2_authorized });
    } catch (err) {
      this.logger.error(err, { code: ec.b2_authorization_failed });
      throw err;
    }
  }

  /**
   * Downlaod the requested file and returns the downloaded asset path
   * @param request
   * @param downloadFileDirectory the directory to which the file need to be downloaded
   */
  async download(remoteFile: RemoteFile, downloadFileDirectory: string): Promise<string> {
    try {
      await this.authorize();
      const filePath = this.getDownloadFilePath(remoteFile.fileName, remoteFile.requestId, downloadFileDirectory);
      const writer = fs.createWriteStream(filePath);
      const response = await this.b2.downloadFileById({
        fileId: remoteFile.fileId,
        responseType: "stream",
      });
      response.data.pipe(writer);
      // TODO: Do some sanity checks like verifying file size and sha1 etc
      return new Promise((resolve, reject) => {
        writer.on("finish", () => {
          this.logger.info(ic.downloaded_input_asset, {
            code: ic.downloaded_input_asset,
            inputAssetPath: filePath,
            requestId: remoteFile.requestId,
          });
          resolve(filePath);
        });
        writer.on("error", reject);
      });
    } catch (err) {
      this.logger.error(err, { code: ec.b2_download_asset_failed, remoteFile });
      throw err;
    }
  }

  /**
   * Upload both manifest and media segment to b2
   * @param transcodedMedia
   */
  async uploadTranscodedMedia(trancodedMedia: TranscodedMedia): Promise<UploadTranscodedMediaResponse> {
    const requestId = trancodedMedia.requestId;
    try {
      const uploadManifestPromise = this.uploadFileToB2(trancodedMedia.manifest, "application/x-mpegURL", requestId);
      const uploadMediaSegmentPromise = this.uploadFileToB2(trancodedMedia.mediaSegment, "video/MP2T", requestId);
      this.logger.info(ic.uploaded_transcoded_assets, {
        code: ic.uploaded_transcoded_assets,
        requestId,
      });
      return <UploadTranscodedMediaResponse>{
        requestId: trancodedMedia.requestId,
        remoteManifest: await uploadManifestPromise,
        remoteMediaSegment: await uploadMediaSegmentPromise,
      };
    } catch (err) {
      const newErr: any = new Error("Failed to upload trancoded assets");
      this.logger.error(newErr, {
        code: ec.failed_to_upload_trancoded_assets,
        requestId,
        trancodedMedia,
      });
      throw newErr;
    }
  }

  /**
   * Returns the download file location. => INPUT_DIR/requestID.ext
   * @param fileName
   * @param requestId
   * @param downloadFileDirectory
   */
  private getDownloadFilePath(fileName: string, requestId: string, downloadFileDirectory: string) {
    const ext = path.extname(fileName);
    return `${downloadFileDirectory}/${requestId}${ext}`;
  }

  /**
   * Uplaod a single file to B2
   * @param filePath
   * @param mimeType
   */
  private async uploadFileToB2(filePath: string, mimeType: string, requestId: string): Promise<RemoteFile> {
    const b2 = await this.b2.authorize();
    const uploadUrlResponse = await this.b2.getUploadUrl({
      bucketId: this.config.get(B2_OUTPUT_BUCKET_ID, ""),
    });

    // TODO: convert to large file upload
    const buf = fs.readFileSync(filePath);
    try {
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
    } catch (err) {
      this.logger.error(err, {
        code: ec.failed_to_upload_file_to_object_store,
        filePath,
        mimeType,
        requestId,
      });
      throw err;
    }
  }
}

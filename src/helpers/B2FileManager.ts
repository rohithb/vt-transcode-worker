import {
  ObjectStoreManager,
  RemoteFile,
  TranscodeMediaRequest,
  UploadTranscodedMediaResponse,
  TranscodedMedia,
  RemoteVariantFiles,
} from "../interfaces";
import { singleton, injectable, container } from "tsyringe";
import path from "path";
import fs from "fs";
import BackBlazeB2 from "backblaze-b2";
import Logger from "./Logger";
import { ic, ec } from "@/constants/logging";
import Config from "./Config";
import { B2_OUTPUT_BUCKET_ID } from "@/constants/config";
import { PLAYLIST_MIME_TYPE, VIDEO_MIME_TYPE } from "@/constants/others";

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
    const promises: any = [];

    let masterPlaylist: RemoteFile;
    const remoteVariantFiles = [] as RemoteVariantFiles[];

    const uploadMasterPlaylistPromise = this.uploadFileToB2(
      trancodedMedia.masterPlaylist,
      PLAYLIST_MIME_TYPE,
      requestId
    )
      .then((rf) => {
        masterPlaylist = rf;
      })
      .catch(() => {
        // Don't have to do anything here as the error is already logged and finally handled in Promise.allSettled
      });

    promises.push(uploadMasterPlaylistPromise);

    trancodedMedia.variants.forEach((variant) => {
      const playlistPromise = this.uploadFileToB2(variant.playlist, PLAYLIST_MIME_TYPE, requestId);
      const segmentPromise = this.uploadFileToB2(variant.mediaSegment, VIDEO_MIME_TYPE, requestId);

      Promise.all([playlistPromise, segmentPromise])
        .then((results) => {
          const remoteVariant = <RemoteVariantFiles>{
            resolution: variant.resolution,
            playlist: results[0],
            mediaSegment: results[1],
          };
          remoteVariantFiles.push(remoteVariant);
        })
        .catch((err) => {
          // Don't have to do anything here as the error is already logged and finally handled in Promise.allSettled
        });

      promises.push(playlistPromise, segmentPromise);
    });

    return new Promise((resolve, reject) => {
      Promise.allSettled(promises).then((results) => {
        // @ts-ignore
        if (!this.isAnyRejectedPromise(results)) {
          this.logger.info(ic.uploaded_transcoded_assets, {
            code: ic.uploaded_transcoded_assets,
            requestId,
          });
          resolve(<UploadTranscodedMediaResponse>{
            requestId,
            masterPlaylist,
            variants: remoteVariantFiles,
          });
        } else {
          const newErr: any = new Error("Failed to upload trancoded assets");
          this.logger.error(newErr, {
            code: ec.uploader_failed_to_upload_trancoded_assets,
            requestId,
            trancodedMedia,
          });
          reject(newErr);
        }
      });
    });
  }

  /**
   * Return true if any of the input promise is rejected
   * @param promiseResults
   */
  private isAnyRejectedPromise(promiseResults: PromiseSettledResult<any>[]): boolean {
    return promiseResults.some((result) => result.status === "rejected");
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
        code: ec.uploader_failed_to_upload_file,
        filePath,
        mimeType,
        requestId,
      });
      throw err;
    }
  }
}

import { ObjectStoreManager, RemoteFile, TranscodeMediaRequest, UploadTranscodedMediaResponse } from "../interfaces";
import { singleton, injectable } from "tsyringe";
import BackBlazeB2 from "backblaze-b2";
import Logger from "./Logger";

@singleton()
@injectable()
export default class B2FileManager implements ObjectStoreManager {
  private b2: BackBlazeB2;
  private logger: Logger;

  constructor(b2: BackBlazeB2, logger: Logger) {
    this.b2 = b2;
    this.logger = logger;
  }

  /**
   * Authorize B2 client
   */
  private async authorize() {
    await this.b2.authorize();
    this.logger.info("B2 authorized");
  }

  async download(request: RemoteFile): Promise<string> {
    await this.authorize();
    console.log(this.b2);

    // @ts-ignore
    return this.b2.apiUrl;
    // throw new Error("Method not implemented.");
  }

  uploadTranscodedMedia(request: TranscodeMediaRequest): Promise<UploadTranscodedMediaResponse> {
    throw new Error("Method not implemented.");
  }
}

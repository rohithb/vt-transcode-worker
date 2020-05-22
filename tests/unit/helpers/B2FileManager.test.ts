import "reflect-metadata";
import { container } from "tsyringe";
import sinon from "sinon";
import BackBlazeB2 from "backblaze-b2";
import B2FileManager from "@/helpers/B2FileManager";
import Config from "@/helpers/Config";
import { mockLogger, getMockConfig, getAssetPath, removeOutputFiles } from "@tests/testUtils";
import BackBlazeB2Mock from "@tests/__mocks__/BackBlazeB2";
import { RemoteFile, TranscodedMedia } from "@/interfaces";
import FileUtils from "@/utils/File";
import fs from "fs";

/**
 * @group unit/helper/B2FileManager
 */
describe("B2 File Manager", () => {
  const assetPath = getAssetPath("");
  const outputDir = "output";
  const tempFileOutputPath = `${assetPath}/${outputDir}`;

  beforeAll(() => {
    mockLogger();
    const configMock = getMockConfig({
      paths: { assetsBasePath: assetPath, outputDirectory: outputDir },
      remoteStorage: {
        backblaze: {
          keyId: "abcd",
          appKey: "abcd",
          bucketId: "abcd",
        },
      },
    });
    //@ts-ignore
    container.registerInstance(BackBlazeB2, new BackBlazeB2Mock());
    //@ts-ignore
    container.registerInstance(Config, configMock);
  });

  beforeEach(() => {
    const fileUtils = container.resolve<FileUtils>(FileUtils);
    fileUtils.ensureInputAndOutputPathExists(getAssetPath(""), "output");
  });

  afterEach(() => {
    removeOutputFiles(tempFileOutputPath);
  });

  test("downloads file from b2", async () => {
    const b2FileManager = container.resolve<B2FileManager>(B2FileManager);
    const requestId = "123456789";
    const remoteFile = <RemoteFile>{
      fileId: "uuid_2123_uuid_23",
      fileName: "test.txt",
      requestId,
    };
    await b2FileManager.download(remoteFile, tempFileOutputPath);
    const outputFile = `${tempFileOutputPath}/${requestId}.txt`;
    const b2 = container.resolve<BackBlazeB2>(BackBlazeB2);
    expect(fs.existsSync(outputFile)).toBeTruthy();
    expect(b2.authorize).toBeCalled();
    expect(b2.downloadFileById).toBeCalled();
  });

  test("upload file to b2", async () => {
    const requestId = "123456789";
    const b2FileManager = container.resolve<B2FileManager>(B2FileManager);
    const transcodedMedia = <TranscodedMedia>{
      manifest: getAssetPath("sample_playlist.m3u8"),
      mediaSegment: getAssetPath("sample1.mp4"),
      requestId,
    };
    const reponse = await b2FileManager.uploadTranscodedMedia(transcodedMedia);
    expect(reponse.requestId).toBe(requestId);
    const b2 = container.resolve<BackBlazeB2>(BackBlazeB2);
    expect(b2.uploadFile).toBeCalled();
  });

  test("b2 authorization fails", async () => {
    const b2 = container.resolve<BackBlazeB2>(BackBlazeB2);
    const authStub = sinon.stub(b2, "authorize").throws("Invalid credentials");
    const b2FileManager = container.resolve<B2FileManager>(B2FileManager);
    const requestId = "123456789";
    const remoteFile = <RemoteFile>{
      fileId: "uuid_2123_uuid_23",
      fileName: "test.txt",
      requestId,
    };
    const response = b2FileManager.download(remoteFile, tempFileOutputPath);
    expect(response).rejects.toThrow();
  });
});

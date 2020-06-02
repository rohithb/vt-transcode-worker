import "reflect-metadata";
import { container } from "tsyringe";
import sinon from "sinon";
import BackBlazeB2 from "backblaze-b2";
import Config from "@/helpers/Config";
import {
  mockLogger,
  getMockConfig,
  getAssetPath,
  removeOutputFiles,
  getMockAmqpConnectionAndChannel,
} from "@tests/testUtils";
import BackBlazeB2Mock from "@tests/__mocks__/BackBlazeB2";
import { RemoteFile, TranscodedMedia, TranscodeWorkerInput } from "@/interfaces";
import mockAmqplib from "mock-amqplib";
import amqpOriginalLib from "amqplib";
import FileUtils from "@/utils/File";
import Transcode from "@/services/Transcode";

/**
 * @group unit/service/transcode
 */
describe("Transcode service", () => {
  const assetPath = getAssetPath("");
  const outputDir = "output";
  const tempFileOutputPath = `${assetPath}/${outputDir}`;
  const queueName = "test_queue";
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
      amqp: {
        host: "abdcd",
        port: "1234",
        username: "guest",
        password: "gues",
        queues: {
          inputAssetQueue: queueName,
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
    fileUtils.ensureInputAndOutputPathExists();
  });

  afterEach(() => {
    removeOutputFiles(tempFileOutputPath);
  });

  test("transcode input asset and upload to object store", async () => {
    const { connection, channel } = await getMockAmqpConnectionAndChannel(queueName);

    await channel.sendToQueue(queueName, "test-content1");
    sinon.stub(amqpOriginalLib, "connect").returns(connection);

    const transcodeService = container.resolve<Transcode>(Transcode);
    const remoteFile = <RemoteFile>{
      requestId: "abcd_12345",
      fileId: "12342344abcd",
      fileName: "test_file.mp4",
    };
    const response = await transcodeService.transcodeInputAssetAndUploadToObjectStore(<TranscodeWorkerInput>{
      requestId: "abcd_12345",
      inputRemoteFile: remoteFile,
      transcodeConfig: {},
    });
    expect(response).toBeDefined();
    expect(response.requestId).toBe("abcd_12345");
    expect(response.remoteManifest.fileId).toBeDefined();
    expect(response.remoteMediaSegment.fileId).toBeDefined();
  }, 20000);
});

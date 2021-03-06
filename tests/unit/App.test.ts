import "reflect-metadata";
import { container } from "tsyringe";
import { mockLogger, getMockConfig, getAssetPath, getMockAmqpConnectionAndChannel } from "@tests/testUtils";
import Config from "@/helpers/Config";
import mockAmqplib from "mock-amqplib";
import sinon from "sinon";
import amqpOriginalLib from "amqplib";
import App from "@/App";
import { RemoteFile, UploadTranscodedMediaResponse, TranscodeWorkerInput } from "@/interfaces";
import Transcode from "@/services/Transcode";
import BackBlazeB2 from "backblaze-b2";
import BackBlazeB2Mock from "@tests/__mocks__/BackBlazeB2";

/**
 * @group /unit/app
 */
describe("App", () => {
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

  afterEach(() => {
    sinon.restore();
  });

  test("start app", async () => {
    const { connection, channel } = await getMockAmqpConnectionAndChannel(queueName);
    sinon.stub(amqpOriginalLib, "connect").returns(connection);

    const transcodeService = container.resolve<Transcode>(Transcode);
    const trancodeStub = sinon
      .stub(transcodeService, "transcodeInputAssetAndUploadToObjectStore")
      .resolves({} as UploadTranscodedMediaResponse);

    const app = container.resolve<App>(App);
    const { consumerTag } = await app.start();

    const remoteFile = <RemoteFile>{
      requestId: "abcd_12345",
      fileId: "12342344abcd",
      fileName: "test_file.mp4",
    };
    const request = <TranscodeWorkerInput>{
      requestId: "abcd_12345",
      inputFile: remoteFile,
      transcodeConfig: {},
    };

    await channel.sendToQueue(queueName, JSON.stringify(request));
    await channel.cancel(consumerTag);
    // expect(trancodeStub).toBeCalled();
  });
});

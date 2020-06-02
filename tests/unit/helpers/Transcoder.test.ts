import "reflect-metadata";
import { container } from "tsyringe";
import Transcoder from "@/helpers/Transcoder";
import { getAssetPath, removeOutputFiles, mockLogger, getMockConfig } from "@tests/testUtils";
import fs from "fs";
import { TranscodeMediaRequest, TranscodeConfig } from "@/interfaces";
import FileUtils from "@/utils/File";
import Config from "@/helpers/Config";

/**
 * @group unit/helper/transcoder
 */
describe("Transcoder", () => {
  const assetPath = getAssetPath("");
  const outputDir = "output";
  const tempFileOutputPath = `${assetPath}/${outputDir}`;

  beforeAll(() => {
    const configMock = getMockConfig({
      paths: { assetsBasePath: assetPath, outputDirectory: outputDir },
    });
    mockLogger();
    //@ts-ignore
    container.registerInstance(Config, configMock);
  });

  beforeEach(() => {
    removeOutputFiles(tempFileOutputPath);
    const fileUtils = container.resolve<FileUtils>(FileUtils);
    fileUtils.ensureInputAndOutputPathExists();
  });

  afterAll(() => {
    // removeOutputFiles(tempFileOutputPath);
  });

  it("should works properly", async () => {
    const transcoder = container.resolve<Transcoder>(Transcoder);
    const request: TranscodeMediaRequest = {
      requestId: "151a8ac8-1654-4fe8-a435-72039fe70acd",
      inputAssetPath: getAssetPath("sample1.mp4"),
      transcodeConfig: <TranscodeConfig>{
        renditions: [
          {
            resolution: {
              width: 1280,
              height: 720,
            },
            videoBitRate: 4000,
            audioBitRate: 192,
          },
          {
            resolution: {
              width: 854,
              height: 480,
            },
            videoBitRate: 2000,
            audioBitRate: 144,
          },
        ],
      },
    };
    const output = await transcoder.transcodeMedia(request);
    // expect(fs.existsSync(output.manifest)).toBe(true);
    // expect(fs.existsSync(output.mediaSegment)).toBe(true);
    expect(output.requestId).toBe(request.requestId);
  }, 20000);

  it("should throw error on invalid path", async () => {
    const transcoder = container.resolve<Transcoder>(Transcoder);
    const request: TranscodeMediaRequest = {
      requestId: "151a8ac8-1654-4fe8-a435-72039fe70acd",
      inputAssetPath: getAssetPath("sample12.mp4"),
      transcodeConfig: {},
    };
    // const output = transcoder.transcodeMedia(request);
    expect(transcoder.transcodeMedia(request)).rejects.toThrowError();
  });
});

import "reflect-metadata";
import { getMockConfig, mockLogger, getAssetPath, removeOutputFiles } from "@tests/testUtils";
import { container } from "tsyringe";
import FfmpegUtil from "@/utils/Ffmpeg";
import sinon from "sinon";
import ffmpeg, { FfprobeData, FfmpegCommand } from "fluent-ffmpeg";

/**
 * @group unit/utils/Fgmpeg
 */
describe("ffmpeg utils", () => {
  const assetPath = getAssetPath("");
  const outputDir = "output";
  const tempFileOutputPath = `${assetPath}/${outputDir}`;
  let ffmpegUtils: FfmpegUtil;
  beforeAll(() => {
    // const configMock = getMockConfig({
    //   paths: { assetsBasePath: assetPath, outputDirectory: outputDir },
    // });
    mockLogger();
    //@ts-ignore
    // container.registerInstance(Config, configMock);
    ffmpegUtils = container.resolve<FfmpegUtil>(FfmpegUtil);
  });
  beforeEach(() => {
    removeOutputFiles(tempFileOutputPath);
  });

  afterAll(() => {
    removeOutputFiles(tempFileOutputPath);
  });

  afterEach(() => {
    sinon.restore();
  });

  test("getMetaData successfully", async () => {
    const output = await ffmpegUtils.getMetaData(getAssetPath("sample1.mp4"));
    expect(output.streams.length).toBe(2); // audio and video stream
  });

  test("get Meata data failure for non video files", () => {
    const output = ffmpegUtils.getMetaData(getAssetPath("sample_playlist.txt"));
    expect(output).rejects.toThrowError();
  });

  test("get frame rate success case", async () => {
    const output = await ffmpegUtils.getFrameRate(getAssetPath("sample1.mp4"));
    expect(output).toBe(24);
  });

  test("get frame rate exception handling for non video files", () => {
    const output = ffmpegUtils.getFrameRate(getAssetPath("sample_playlist.m3u8"));
    expect(output).rejects.toThrowError();
  });

  test("get frame rate exception handling when video stream is not present", () => {
    sinon.stub(ffmpegUtils, "getMetaData").resolves({
      streams: [{ codec_type: "audio" }],
    } as FfprobeData);
    const output = ffmpegUtils.getFrameRate(getAssetPath("sample1.mp4"));
    expect(output).rejects.toThrowError();
  });

  test("get frame rate exception handling when frame rate cannot be extracted", () => {
    sinon.stub(ffmpegUtils, "getMetaData").resolves({
      streams: [{ codec_type: "video" }],
    } as FfprobeData);
    const output = ffmpegUtils.getFrameRate(getAssetPath("sample1.mp4"));
    expect(output).rejects.toThrowError();
  });

  test("ffmpeg run command error for non video file", () => {
    let ffmpegCommand: FfmpegCommand = ffmpeg({
      source: getAssetPath("sample_playlist.m3u8"),
    }).addInputOption("-hide_banner -y");

    const output = ffmpegUtils.runCommand(ffmpegCommand);
    expect(output).rejects.toThrowError();
  });
});

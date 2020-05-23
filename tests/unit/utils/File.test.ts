import "reflect-metadata";
import { container } from "tsyringe";
import { mockLogger, getAssetPath, getMockConfig, removeOutputFiles } from "@tests/testUtils";
import FileUtils from "@/utils/File";
import fs from "fs";
import Config from "@/helpers/Config";
import { TranscodeMediaRequest } from "@/interfaces";
import { FILE_SEPARATOR, OUTPUT_MANIFEST_NAME, OUTPUT_SEGMENT_NAME } from "@/constants/others";
import { ASSETS_BASE_PATH } from "@/constants/config";

/**
 * @group unit/utils/File
 */
describe("File Utils", () => {
  const assetPath = getAssetPath("");
  const outputDir = "output";
  const tempFileOutputPath = `${assetPath}/${outputDir}`;
  let fileUtils: FileUtils;

  beforeAll(() => {
    const configMock = getMockConfig({
      paths: { assetsBasePath: assetPath, outputDirectory: outputDir },
    });
    mockLogger();
    //@ts-ignore
    container.registerInstance(Config, configMock);
    fileUtils = container.resolve<FileUtils>(FileUtils);
  });
  beforeEach(() => {
    removeOutputFiles(tempFileOutputPath);
  });

  afterAll(() => {
    removeOutputFiles(tempFileOutputPath);
  });

  test("ensure input and output path exists sucess", () => {
    fileUtils.ensureInputAndOutputPathExists();
    expect(fs.existsSync(assetPath)).toBeTruthy();
    expect(fs.existsSync(tempFileOutputPath)).toBeTruthy();
    // check the path have read and write permissions
    fs.accessSync(assetPath, fs.constants.R_OK | fs.constants.W_OK);
    fs.accessSync(tempFileOutputPath, fs.constants.R_OK | fs.constants.W_OK);
  });

  test("ensure input and output path exists- throws error- without input path", () => {
    const mockConfig = container.resolve<Config>(Config);
    const currentVal = mockConfig.get(ASSETS_BASE_PATH);
    //@ts-ignore
    mockConfig.set(ASSETS_BASE_PATH, "");
    expect(() => {
      fileUtils.ensureInputAndOutputPathExists();
    }).toThrowError();
    //@ts-ignore
    mockConfig.set(ASSETS_BASE_PATH, currentVal);
  });

  test("delete file success", () => {
    fileUtils.ensureInputAndOutputPathExists();
    const filepath = `${tempFileOutputPath}/test_file.txt`;
    fs.openSync(filepath, "w");
    expect(fs.existsSync(filepath)).toBeTruthy();
    const res = fileUtils.deleteFiles([filepath], "abcd123");
    expect(res).toBeTruthy();
    expect(fs.existsSync(filepath)).toBeFalsy();
  });

  test("delete file exception handling", () => {
    fileUtils.ensureInputAndOutputPathExists();
    const filepath = `${tempFileOutputPath}/test_file.txt`;
    expect(fs.existsSync(filepath)).toBeFalsy();
    const res = fileUtils.deleteFiles([filepath], "abcd123");
    expect(res).toBeFalsy();
  });

  test("get output manifest path", () => {
    const transcodeMedia = <TranscodeMediaRequest>{
      requestId: "abcd1234",
      inputAssetPath: getAssetPath("sample1.mp4"),
    };
    const response = fileUtils.getOutputManifestPath(transcodeMedia);
    const expectedResponse = `${tempFileOutputPath}/${transcodeMedia.requestId}${FILE_SEPARATOR}${OUTPUT_MANIFEST_NAME}`;
    expect(response).toBe(expectedResponse);
  });

  test("get output segment path", () => {
    const transcodeMedia = <TranscodeMediaRequest>{
      requestId: "abcd1234",
      inputAssetPath: getAssetPath("sample1.mp4"),
    };
    const response = fileUtils.getOutputSegmentPath(transcodeMedia);
    const expectedResponse = `${tempFileOutputPath}/${transcodeMedia.requestId}${FILE_SEPARATOR}${OUTPUT_SEGMENT_NAME}`;
    expect(response).toBe(expectedResponse);
  });
});

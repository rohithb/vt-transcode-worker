import Transcoder from "../../src/Transcoder";
import sinon from "sinon";
import { getAssetPath, removeOutputFiles } from "../testUtils";
import { TranscodeMediaRequest } from "../../src/types/types";
import FileHanlder from "../../src/FileHandler";
import fs from "fs";

/**
 * @group unit/transcoder
 */
describe("Transcoder", () => {
  beforeAll(() => {
    process.env.ASSETS_PATH = getAssetPath("");
    process.env.OUTPUT_FOLDER = "output";
    removeOutputFiles(`${process.env.ASSETS_PATH}/${process.env.OUTPUT_FOLDER}`);
    FileHanlder.ensureInputAndOutputPathExists();
  });

  afterEach(() => {
    sinon.restore();
  });
  afterAll(() => {
    removeOutputFiles(`${process.env.ASSETS_PATH}/${process.env.OUTPUT_FOLDER}`);
    process.env.ASSETS_PATH = "";
    process.env.OUTPUT_FOLDER = "";
  });

  it("should works properly", async () => {
    const transcoder = new Transcoder();
    const request: TranscodeMediaRequest = {
      id: "151a8ac8-1654-4fe8-a435-72039fe70acd",
      inputAssetPath: getAssetPath("sample1.mp4"),
    };
    const output = await transcoder.transcodeMedia(request);
    expect(fs.existsSync(output.manifest)).toBe(true);
    expect(fs.existsSync(output.mediaSegment)).toBe(true);
    expect(output.id).toBe(request.id);
  }, 20000);

  it("should throw error on invalid path", async () => {
    const transcoder = new Transcoder();
    const request: TranscodeMediaRequest = {
      id: "151a8ac8-1654-4fe8-a435-72039fe70acd",
      inputAssetPath: getAssetPath("sample12.mp4"),
    };
    const output = transcoder.transcodeMedia(request);
    expect(output).rejects.toThrowError();
  });
});

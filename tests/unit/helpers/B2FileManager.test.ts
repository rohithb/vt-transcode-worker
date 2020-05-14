import sinon from "sinon";
import "reflect-metadata";
import BackBlazeB2 from "backblaze-b2";
import { container } from "tsyringe";
import B2FileManager from "../../../src/helpers/B2FileManager";
import { mockLogger, getAssetPath } from "../../testUtils";
import Logger from "../../../src/helpers/Logger";
import fs from "fs";
import BackBlazeB2Mock from "../../__mocks__/BackBlazeB2";

describe("B2 File Manager", () => {
  beforeAll(() => {
    mockLogger();
  });

  beforeEach(() => {
    // container.clearInstances();
    // const b2 = new BackBlazeB2({
    //   applicationKeyId: "abcd",
    //   applicationKey: "ABCD",
    // });
    // @ts-ignore
    container.registerInstance(BackBlazeB2, new BackBlazeB2Mock());
  });

  test("should send authorize reqest", async () => {
    // const b2FileManager = container.resolve<B2FileManager>(B2FileManager);
    // console.log(b2FileManager);
    // const logger = container.resolve<Logger>(Logger);
    // logger.error("this is an error");
    // expect(logger.error).toBeCalled();

    const writer = fs.createWriteStream(getAssetPath("") + "/test.txt");

    const b2 = container.resolve<BackBlazeB2>(BackBlazeB2);
    console.log(b2);
    const response = await b2.downloadFileById({
      fileId: "request.fileId",
      responseType: "stream",
    });

    response.data.pipe(writer);
    expect(b2.downloadFileById).toBeCalled();
    // await b2FileManager.download({
    //   requestId: "asd",
    //   fileId: "asdasdas",
    //   fileName: "adas",
    // });
  });
});

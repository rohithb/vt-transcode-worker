import sinon from "sinon";
import "reflect-metadata";
import BackBlazeB2 from "backblaze-b2";
import { container } from "tsyringe";
import B2FileManager from "../../../src/helpers/B2FileManager";
import Logger from "../../../src/helpers/Logger";

describe("B2 File Manager", () => {
  beforeEach(() => {
    container.clearInstances();
    const b2 = new BackBlazeB2({
      applicationKeyId: "abcd",
      applicationKey: "ABCD",
    });
    container.registerInstance(BackBlazeB2, b2);
    const logger = jest.genMockFromModule(Logger);
    // container.registerSingleton(Logger, new Logger());
  });

  test("should send authorize reqest", async () => {
    const b2FileManager = container.resolve<B2FileManager>(B2FileManager);
    console.log(b2FileManager);
    // await b2FileManager.download({
    //   requestId: "asd",
    //   fileId: "asdasdas",
    //   fileName: "adas",
    // });
  });
});

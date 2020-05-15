import sinon from "sinon";
import "reflect-metadata";
import BackBlazeB2 from "backblaze-b2";
import { container } from "tsyringe";
import B2FileManager from "../../../src/helpers/B2FileManager";
import { mockLogger, getAssetPath } from "../../testUtils";
import fs from "fs";
import BackBlazeB2Mock from "../../__mocks__/BackBlazeB2";

describe("B2 File Manager", () => {
  beforeAll(() => {
    mockLogger();
  });

  beforeEach(() => {
    mockLogger();
    //@ts-ignore
    container.registerInstance(BackBlazeB2, new BackBlazeB2Mock());
  });

  test("should send authorize reqest", async () => {});
});

import "reflect-metadata";
import { container } from "tsyringe";
import { mockLogger } from "@tests/testUtils";
import Validator from "@/utils/Validator";

/**
 * @group unit/utils/Validator
 */
describe("Validator Util", () => {
  const schema = {
    properties: {
      requestId: { type: "string" },
      contentLength: { type: "number" },
    },
    required: ["requestId", "contentLength"],
  };
  beforeAll(() => {
    mockLogger();
  });

  test("Valid schema", () => {
    const data = {
      requestId: "adkasdkasda",
      contentLength: 1231,
    };
    const validator = container.resolve<Validator>(Validator);
    const response = validator.validateSchema(schema, data);
    expect(response).toBeTruthy();
  });

  test("Invalid schema", () => {
    const data = {
      requestId: "adkasdkasda",
      contentType: "video/mp4",
    };
    const validator = container.resolve<Validator>(Validator);
    const response = validator.validateSchema(schema, data);
    expect(response).toBeFalsy();
  });
});

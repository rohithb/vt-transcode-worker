import { Readable } from "stream";
import { getAssetPath } from "@tests/testUtils";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

export default class BackBlazeB2 {
  public authorize = jest.fn();

  public downloadFileById = jest.fn(() => {
    return {
      // data: Readable.from("Backblaze mock", { encoding: "utf8" }),
      data: fs.createReadStream(getAssetPath("sample1.mp4")),
    };
  });

  public getUploadUrl = jest.fn(() => {
    return {
      data: {
        uploadUrl: "https://abcd.backblaze.com/file/somefile",
        authorizationToken: "I grant you permission to upload ;-)",
      },
    };
  });

  public uploadFile = jest.fn((request) => {
    return {
      data: {
        contentLength: 10293,
        contentSha1: "aszxczvsdasd1231asda123",
        contentType: request.mime || "video/mp4",
        fileId: uuidv4(),
        fileName: request.fileName || "awesome_file.mp4",
        uploadTimestamp: (Date.now() / 1000) | 0,
      },
    };
  });
}

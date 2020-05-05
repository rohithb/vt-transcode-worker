import { config } from "dotenv";
import FileHandler from "./FileHandler";
import amqp from "amqplib";
import Transcoder from "./Transcoder";
import { TranscodeMediaRequest } from "./types/types";
config();

FileHandler.ensureInputAndOutputPathExists();

amqp
  .connect("amqp://localhost")
  .then(function (conn) {
    process.once("SIGINT", function () {
      conn.close();
    });
    return conn.createChannel().then(function (ch) {
      var ok = ch.assertQueue("test-queue", { durable: true });

      ok.then(function (_qok) {
        return ch.consume(
          "test-queue",
          async (msg) => {
            if (msg) {
              console.log(" [x] Received '%s'", msg.content.toString());
              const request = JSON.parse(msg.content.toString());
              const inputAssetPath = await FileHandler.downloadFileFromB2(request.url, request.id);
              // const inputAssetPath = "/Users/rohithb/Downloads/assets_test/abcd123.mp4";
              console.log(" [x] downloaded asset from b2 to '%s': ", inputAssetPath);
              const transcoder = new Transcoder();
              const transcodeRequest: TranscodeMediaRequest = {
                id: request.id,
                inputAssetPath: inputAssetPath,
              };
              const transcodedMedia = await transcoder.transcodeMedia(transcodeRequest);
              console.log(" [x] transcoded asset at '%s': ", transcodedMedia.manifest);
              // Upload the transcoded media
              const response = await FileHandler.uploadTranscodedMedia(transcodedMedia);
              console.log(
                " [x] Uploaded transcoded assets: %s , %s",
                response.manifestResponse.fileName,
                response.mediaSegmentResponse.fileName
              );
              // Delete both src and transcoded items
              FileHandler.deleteFiles([inputAssetPath, transcodedMedia.manifest, transcodedMedia.mediaSegment]);
              console.log(" [x] deleted all temporary files");
              ch.ack(msg);
            }
          },
          { noAck: false }
        );
      });

      return ok.then(function (_consumeOk) {
        console.log(" [*] Waiting for messages. To exit press CTRL+C");
      });
    });
  })
  .catch(console.error);

import "reflect-metadata";
// import FileHandler from "./FileHandler";
import amqp from "amqplib";
import Transcoder from "./services/Transcoder";
import AmqpHandler from "./AmqpHandler";
import { TranscodeMediaRequest } from "./interfaces";
import { container } from "tsyringe";
require("./register");
import B2FileManager from "./helpers/B2FileManager";

const instance = container.resolve(B2FileManager);

// FileHandler.ensureInputAndOutputPathExists();

// async function handleMQMessage(msg: amqp.ConsumeMessage) {
//   console.log(" [x] Received '%s'", msg.content.toString());
//   const request = JSON.parse(msg.content.toString());
//   //TODO: validate schema
//   const inputAssetPath = await FileHandler.downloadFileFromB2(request);
//   // const inputAssetPath = "/Users/rohithb/Downloads/assets_test/abcd123.mp4";
//   console.log(" [x] downloaded asset from b2 to '%s': ", inputAssetPath);
//   const transcoder = new Transcoder();
//   const transcodeRequest: TranscodeMediaRequest = {
//     requestId: request.id,
//     inputAssetPath: inputAssetPath,
//   };
//   const transcodedMedia = await transcoder.transcodeMedia(transcodeRequest);
//   console.log(" [x] transcoded asset at '%s': ", transcodedMedia.manifest);
//   // Upload the transcoded media
//   const response = await FileHandler.uploadTranscodedMedia(transcodedMedia);
//   console.log(
//     " [x] Uploaded transcoded assets: %s , %s",
//     response.manifestResponse.fileName,
//     response.mediaSegmentResponse.fileName
//   );
//   // Delete both src and transcoded items
//   FileHandler.deleteFiles([inputAssetPath, transcodedMedia.manifest, transcodedMedia.mediaSegment]);
//   console.log(" [x] deleted all temporary files");
// }

// AmqpHandler.consumeMessage("task-queue", handleMQMessage);

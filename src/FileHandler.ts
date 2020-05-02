import { dirname } from "path";
import { TranscodeMediaRequest } from "types";

export default class FileHandler {
  private static OUTPUT_MANIFEST_NAME = "palylist.m3u8";
  private static OUTPUT_SEGMENT_NAME = "asset.ts";

  /**
   * returns the output manigest path
   * @param transcodeMedia
   */
  public static getOutputManifestPath(transcodeMedia: TranscodeMediaRequest): string {
    const outputPath = dirname(transcodeMedia.inputAssetPath);
    return `${outputPath}${transcodeMedia.id}/${this.OUTPUT_MANIFEST_NAME}`;
  }

  /**
   * returns the output media segment path
   * @param transcodeMedia
   */
  public static getOutputSegmentPath(transcodeMedia: TranscodeMediaRequest): string {
    const outputPath = dirname(transcodeMedia.inputAssetPath);
    return `${outputPath}${transcodeMedia.id}/${this.OUTPUT_SEGMENT_NAME}`;
  }
}

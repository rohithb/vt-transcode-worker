import { ConsumeMessage } from "amqplib";

/**
 * Represents a file stored in a remote object store, like Backblaze B2
 */
export interface RemoteFile {
  requestId: string;
  contentLength?: number;
  contentSha1?: string;
  contentType?: string;
  fileId: string;
  fileName: string;
  uploadTimestamp?: number;
}

export interface Resolution {
  width: number;
  height: number;
}

export interface Rendition {
  resolution: Resolution;
  videoBitRate: number;
  audioBitRate: number;
}

export enum FFmpegPreset {
  UltraFast = "ultrafast",
  SuperFast = "superfast",
  VeryFast = "veryfast",
  Faster = "faster",
  Fast = "fast",
  Medium = "medium",
  Slow = "slow",
  Slower = "slower",
  verySlow = "veryslow",
}

export interface TranscodeConfig {
  renditions: Rendition[];
  /**
   * Presets affect the encoding speed.
   * Using a slower preset gives you better compression, or quality per filesize,
   * whereas faster presets give you worse compression
   * @default 'veryfast'
   */
  preset: FFmpegPreset | string;
  /**
   *@default 'libx264'
   */
  videoCodec: string;
  /**
   * @default 'aac'
   */
  audioCodec: string;
  /**
   * Segment size in seconds
   * @default 6
   */
  segmentDuration: number;
}

/**
 * This is used as the primary input structure for transcode worker.
 * The message in the input message queue should be in this format
 */
export interface TranscodeWorkerInput {
  requestId: string;
  inputRemoteFile: RemoteFile;
  transcodeConfig: TranscodeConfig;
}

export interface TranscodeMediaRequest {
  requestId: string;
  inputAssetPath: string;
  transcodeConfig: Partial<TranscodeConfig>;
}

export interface TranscodedMedia {
  requestId: string;
  manifest: string;
  mediaSegment: string;
}

export interface TranscoderRequest extends TranscodeMediaRequest {
  output: TranscodedMedia;
}

export interface UploadTranscodedMediaResponse {
  requestId: string;
  remoteManifest: RemoteFile;
  remoteMediaSegment: RemoteFile;
}

export interface ObjectStoreManager {
  download(remoteFile: RemoteFile, downloadFileDirectory: string): Promise<string>;
  uploadTranscodedMedia(transcodedMedia: TranscodedMedia): Promise<UploadTranscodedMediaResponse>;
}

export type amqpHanderFn = (msg: ConsumeMessage) => void;

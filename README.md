# vt-transcode-worker

A video transcoder service, which prepares the video for streaming using HLS.  
Transcode worker will transcode the videos into multiple renditions using ffmpeg, creates the HLS manifest and uploads it to S3 or any other object store.

### Request message format

```js
export interface TranscodeWorkerInput {
  requestId: string;
  inputFile: RemoteFile;
  transcodeConfig: TranscodeConfig;
}
```

#### RemoteFile

Details of the input video stored in a remote location

```js
export interface RemoteFile {
  requestId: string;
  contentLength?: number;
  contentSha1?: string;
  contentType?: string;
  fileId: string;
  fileName: string;
  uploadTimestamp?: number;
}
```

#### TranscodeConfig

The configuration for ffmpeg for transcoding the asset.

```js
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

export interface Rendition {
  resolution: {
    width: number;
    height: number;
  };
  videoBitRate: number;
  audioBitRate: number;
}
```

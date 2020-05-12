export interface RemoteFile {
  requestId: string;
  contentLength?: number;
  contentSha1?: string;
  contentType?: string;
  fileId: string;
  fileName: string;
  uploadTimestamp?: number;
}

export interface TranscodeMediaRequest {
  requestId: string;
  inputAssetPath: string;
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
  download(request: RemoteFile): Promise<string>;
  uploadTranscodedMedia(request: TranscodeMediaRequest): Promise<UploadTranscodedMediaResponse>;
}

export interface TranscodedMedia {
  id: string;
  manifest: string;
  mediaSegment: string;
}

export interface TranscoderRequest {
  id: string;
  inputAssetPath: string;
  output: TranscodedMedia;
}

export interface TranscodeMediaRequest {
  id: string;
  inputAssetPath: string;
}

export interface B2Response {
  contentLength: number;
  contentSha1: string;
  contentType: string;
  fileId: string;
  fileName: string;
  uploadTimestamp: number;
}

export interface UploadTranscodedMediaResponse {
  id: string;
  manifestResponse: B2Response;
  mediaSegmentResponse: B2Response;
}

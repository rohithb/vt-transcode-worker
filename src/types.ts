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

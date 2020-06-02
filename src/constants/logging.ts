// info codes
export const ic = {
  transcode_worker_started: "transcode_worker_started",
  b2_authorized: "b2_authorized",
  amqp_connection_established: "amqp_connection_established",
  amqp_connection_closing: "amqp_connection_closing",
  amqp_message_received: "amqp_message_received",
  amqp_message_acked: "amqp_message_acked",

  request_received_start_processing: "request_received_start_processing",
  request_completed_processing: "request_completed_processing",
  downloaded_input_asset: "downloaded_input_asset",
  uploaded_transcoded_assets: "uploaded_transcoded_assets",
  deleted_working_files: "deleted_working_files",
  transcode_completed: "transcode_completed",
};
// Error codes
export const ec = {
  amqp_connection_error: "amqp_connection_error",
  amqp_invalid_message: "amqp_invalid_message",
  b2_authorization_failed: "b2_authorization_failed",
  b2_download_asset_failed: "b2_download_asset_failed",
  config_invalid_asset_base_path: "config_invalid_asset_base_path",
  file_utils_failed_to_delete_file: "file_utils_failed_to_delete_file",
  failed_to_upload_file_to_object_store: "failed_to_upload_file_to_object_store",
  failed_to_upload_trancoded_assets: "failed_to_upload_trancoded_assets",
  failed_to_trancode_input_asset: "failed_to_trancode_input_asset",
  schema_validation_failed: "schema_validation_failed",
  ffmpeg_error: "ffmpeg_error",
  transcoder_no_rendition_present: "transcoder_no_rendition_present",
};
// Warning Codes
export const wc = {};

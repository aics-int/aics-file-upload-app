import { MXSResult } from "../../services/metadata-extraction-service";
import {
  FETCH_METADATA_REQUEST,
  FETCH_METADATA_SUCCEEDED,
  FETCH_METADATA_FAILED,
} from "../metadataExtraction/constants";

export interface FetchMetadataRequestAction {
  type: typeof FETCH_METADATA_REQUEST;
  payload: { filePath: string };
}
export interface FetchMetadataSucceededAction {
  type: typeof FETCH_METADATA_SUCCEEDED;
  payload: { filePath: string; metadata: MXSResult };
}
export interface FetchMetadataFailedAction {
  type: typeof FETCH_METADATA_FAILED;
  payload: { filePath: string; error: any };
}

export function fetchMetadataRequest(
  filePath: string
): FetchMetadataRequestAction {
  return { type: FETCH_METADATA_REQUEST, payload: { filePath } };
}
export function fetchMetadataSucceeded(
  filePath: string,
  metadata: MXSResult
): FetchMetadataSucceededAction {
  return { type: FETCH_METADATA_SUCCEEDED, payload: { filePath, metadata } };
}
export function fetchMetadataFailed(
  filePath: string,
  error: any
): FetchMetadataFailedAction {
  return { type: FETCH_METADATA_FAILED, payload: { filePath, error } };
}

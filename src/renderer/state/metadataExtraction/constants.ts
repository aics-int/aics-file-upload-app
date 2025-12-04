import { makeConstant } from "../util";

export const BRANCH_NAME = "metadataExtraction";
export const FETCH_METADATA_REQUEST = makeConstant(
  BRANCH_NAME,
  "fetch-metadata-request"
);
export const FETCH_METADATA_SUCCEEDED = makeConstant(
  BRANCH_NAME,
  "fetch-metadata-succeeded"
);
export const FETCH_METADATA_FAILED = makeConstant(
  BRANCH_NAME,
  "fetch-metadata-failed"
);

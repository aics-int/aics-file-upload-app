import { makeConstant } from "../util";

const BRANCH_NAME = "metadata";

export const CLEAR_CURRENT_UPLOAD = makeConstant(
  BRANCH_NAME,
  "clear-current-upload"
);
export const CLEAR_OPTIONS_FOR_LOOKUP = makeConstant(
  BRANCH_NAME,
  "clear-options-for-lookup"
);
export const CREATE_BARCODE = makeConstant(BRANCH_NAME, "create-barcode");
export const GET_BARCODE_SEARCH_RESULTS = makeConstant(
  BRANCH_NAME,
  "get-barcode-search-results"
);
export const GET_OPTIONS_FOR_LOOKUP = makeConstant(
  BRANCH_NAME,
  "get-options-for-lookup"
);
export const GET_TEMPLATES = makeConstant(BRANCH_NAME, "get-templates");
export const RECEIVE_METADATA = makeConstant(BRANCH_NAME, "receive");
export const REQUEST_METADATA = makeConstant(BRANCH_NAME, "request");
export const RESET_HISTORY = makeConstant(BRANCH_NAME, "reset-history");
export const REQUEST_ANNOTATION_USAGE = makeConstant(
  BRANCH_NAME,
  "request-annotation-usage"
);
export const RECEIVE_ANNOTATION_USAGE = makeConstant(
  BRANCH_NAME,
  "receive-annotation-usage"
);
export const SET_PLATE_BARCODE_TO_PLATES = makeConstant(
  BRANCH_NAME,
  "set-plate-barcode-to-plates"
);

export const GET_PROGRAM_OPTIONS = makeConstant(
  BRANCH_NAME,
  "get-program-options"
);

export const RECEIVE_PROGRAM_OPTIONS = makeConstant(
  BRANCH_NAME,
  "receive-program-options"
);

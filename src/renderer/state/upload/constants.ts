import * as moment from "moment";

import { LONG_DATETIME_FORMAT } from "../../constants";
import { makeConstant } from "../util";

const BRANCH_NAME = "upload";

export const ADD_UPLOAD_FILES = makeConstant(BRANCH_NAME, "add-upload-files");
export const APPLY_TEMPLATE = makeConstant(BRANCH_NAME, "apply-template");
export const CANCEL_UPLOADS = makeConstant(BRANCH_NAME, "cancel-uploads");
export const CANCEL_UPLOAD_SUCCEEDED = makeConstant(
  BRANCH_NAME,
  "cancel-upload-succeeded"
);
export const CANCEL_UPLOAD_FAILED = makeConstant(
  BRANCH_NAME,
  "cancel-upload-failed"
);
export const CLEAR_UPLOAD_DRAFT = makeConstant(
  BRANCH_NAME,
  "clear-upload-draft"
);
export const CLEAR_UPLOAD_HISTORY = makeConstant(BRANCH_NAME, "clear-history");
export const DELETE_UPLOADS = makeConstant(BRANCH_NAME, "delete-uploads");
export const EDIT_FILE_METADATA_FAILED = makeConstant(
  BRANCH_NAME,
  "edit-file-metadata-failed"
);
export const EDIT_FILE_METADATA_SUCCEEDED = makeConstant(
  BRANCH_NAME,
  "edit-file-metadata-succeeded"
);
export const INITIATE_UPLOAD = makeConstant(BRANCH_NAME, "initiate-upload");
export const INITIATE_UPLOAD_SUCCEEDED = makeConstant(
  BRANCH_NAME,
  "initiate-upload-succeeded"
);
export const INITIATE_UPLOAD_FAILED = makeConstant(
  BRANCH_NAME,
  "initiate-upload-failed"
);
export const UPLOAD_FAILED = makeConstant(BRANCH_NAME, "upload-failed");
export const UPLOAD_SUCCEEDED = makeConstant(BRANCH_NAME, "upload-succeeded");
export const UPLOAD_WITHOUT_METADATA = makeConstant(
  BRANCH_NAME,
  "upload-without-metadata"
);
export const OPEN_UPLOAD_DRAFT = makeConstant(BRANCH_NAME, "open-upload-draft");
export const REPLACE_UPLOAD = makeConstant(BRANCH_NAME, "replace-upload");
export const SAVE_UPLOAD_DRAFT_SUCCESS = makeConstant(
  BRANCH_NAME,
  "save-upload-draft-success"
);
export const SET_SHOULD_BE_IN_LOCAL = makeConstant(
  BRANCH_NAME,
  "set-should-be-in-local"
);
export const SUBMIT_FILE_METADATA_UPDATE = makeConstant(
  BRANCH_NAME,
  "submit-file-metadata-update"
);
export const JUMP_TO_PAST_UPLOAD = makeConstant(BRANCH_NAME, "jump-to-past");
export const JUMP_TO_UPLOAD = makeConstant(BRANCH_NAME, "jump-to-upload");
export const RETRY_UPLOADS = makeConstant(BRANCH_NAME, "retry-uploads");
export const SAVE_UPLOAD_DRAFT = makeConstant(BRANCH_NAME, "save-upload-draft");
export const UPDATE_UPLOAD = makeConstant(BRANCH_NAME, "update-upload");
export const UPDATE_UPLOAD_ROWS = makeConstant(
  BRANCH_NAME,
  "update-upload-rows"
);
export const UPDATE_UPLOADS = makeConstant(BRANCH_NAME, "update-uploads");
export const UPDATE_UPLOAD_PROGRESS_INFO = makeConstant(
  BRANCH_NAME,
  "update-upload-progress-info"
);

export const AUTOFILL_FROM_MXS = "AUTOFILL_FROM_MXS";

export const DRAFT_KEY = "draft";

export const getUploadDraftKey = (name: string, created: Date) =>
  `${DRAFT_KEY}.${name}-${moment(created).format(LONG_DATETIME_FORMAT)}`;

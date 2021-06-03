import { isNil } from "lodash";
import * as moment from "moment";

import { LONG_DATETIME_FORMAT } from "../../constants";
import { UploadRow, UploadRowId } from "../types";
import { makeConstant } from "../util";

const BRANCH_NAME = "upload";

export const ADD_UPLOAD_FILES = makeConstant(BRANCH_NAME, "add-upload-files");
export const APPLY_TEMPLATE = makeConstant(BRANCH_NAME, "apply-template");
export const CANCEL_UPLOAD = makeConstant(BRANCH_NAME, "cancel-upload");
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
export const OPEN_UPLOAD_DRAFT = makeConstant(BRANCH_NAME, "open-upload-draft");
export const REPLACE_UPLOAD = makeConstant(BRANCH_NAME, "replace-upload");
export const SAVE_UPLOAD_DRAFT_SUCCESS = makeConstant(
  BRANCH_NAME,
  "save-upload-draft-success"
);
export const SUBMIT_FILE_METADATA_UPDATE = makeConstant(
  BRANCH_NAME,
  "submit-file-metadata-update"
);
export const UPDATE_AND_RETRY_UPLOAD = makeConstant(
  BRANCH_NAME,
  "update-and-retry-upload"
);
export const JUMP_TO_PAST_UPLOAD = makeConstant(BRANCH_NAME, "jump-to-past");
export const JUMP_TO_UPLOAD = makeConstant(BRANCH_NAME, "jump-to-upload");
export const RETRY_UPLOAD = makeConstant(BRANCH_NAME, "retry-upload");
export const SAVE_UPLOAD_DRAFT = makeConstant(BRANCH_NAME, "save-upload-draft");
export const UPDATE_SUB_IMAGES = makeConstant(BRANCH_NAME, "update-sub-images");
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

// todo could do hash eventually but we're being safe for now
export const getUploadRowKey = ({
  file,
  positionIndex,
  channelId,
  scene,
  subImageName,
}: UploadRowId): string => {
  let key = file;
  if (!isNil(positionIndex)) {
    key += `positionIndex:${positionIndex}`;
  }

  if (!isNil(scene)) {
    key += `scene:${scene}`;
  }

  if (!isNil(subImageName)) {
    key += `subImageName:${subImageName}`;
  }

  if (!isNil(channelId)) {
    key += `channel:${channelId}`;
  }

  return key;
};

export const isSubImageRow = ({
  positionIndex,
  scene,
  subImageName,
}: UploadRow) => !isNil(positionIndex) || !isNil(scene) || !isNil(subImageName);
export const isSubImageOnlyRow = (metadata: UploadRow) =>
  isSubImageRow(metadata) && isNil(metadata.channelId);
export const isChannelOnlyRow = (metadata: UploadRow) =>
  !isNil(metadata.channelId) && !isSubImageRow(metadata);
export const isFileRow = (metadata: UploadRow) =>
  !isChannelOnlyRow(metadata) && !isSubImageRow(metadata);

export const DRAFT_KEY = "draft";

export const getUploadDraftKey = (name: string, created: Date) =>
  `${DRAFT_KEY}.${name}-${moment(created).format(LONG_DATETIME_FORMAT)}`;

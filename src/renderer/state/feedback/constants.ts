import { makeConstant } from "../util";

const BRANCH_NAME = "feedback";

export const SET_ALERT = makeConstant(BRANCH_NAME, "set-alert");
export const CLEAR_ALERT = makeConstant(BRANCH_NAME, "clear-alert");
export const START_LOADING = makeConstant(BRANCH_NAME, "start-loading");
export const STOP_LOADING = makeConstant(BRANCH_NAME, "stop-loading");
export const ADD_REQUEST_IN_PROGRESS = makeConstant(
  BRANCH_NAME,
  "add-request-in-progress"
);
export const REMOVE_REQUEST_IN_PROGRESS = makeConstant(
  BRANCH_NAME,
  "remove-request-in-progress"
);
export const ADD_EVENT = makeConstant(BRANCH_NAME, "add-event");
export const CLOSE_SET_MOUNT_POINT_NOTIFICATION = makeConstant(
  BRANCH_NAME,
  "close-set-mount-point-notification"
);
export const OPEN_SET_MOUNT_POINT_NOTIFICATION = makeConstant(
  BRANCH_NAME,
  "open-set-mount-point-notification"
);
export const OPEN_MODAL = makeConstant(BRANCH_NAME, "open-modal");
export const CLOSE_MODAL = makeConstant(BRANCH_NAME, "close-modal");
export const SET_DEFERRED_ACTION = makeConstant(
  BRANCH_NAME,
  "set-deferred-action"
);
export const CLEAR_DEFERRED_ACTION = makeConstant(
  BRANCH_NAME,
  "clear-deferred-action"
);
export const CLEAR_UPLOAD_ERROR = makeConstant(
  BRANCH_NAME,
  "clear-upload-error"
);
export const TOGGLE_FOLDER_TREE = makeConstant(
  BRANCH_NAME,
  "toggle-folder-tree"
);
export const CLOSE_NOTIFICATION_CENTER = makeConstant(
  BRANCH_NAME,
  "close-notification-center"
);

// Event channels
export const START_UPLOAD = "START_UPLOAD";
export const UPLOAD_FINISHED = "UPLOAD_FINISHED";
export const UPLOAD_FAILED = "UPLOAD_FAILED";
export const UPLOAD_PROGRESS = "UPLOAD_PROGRESS";
export const OPEN_CREATE_PLATE_STANDALONE = "OPEN_CREATE_PLATE";
export const PLATE_CREATED = "PLATE-CREATED";
export const RECEIVED_JOB_ID = "RECEIVED_JOB_ID";
export const SET_LIMS_URL = "SET_LIMS_URL";
export const COPY_COMPLETE = "COPY_COMPLETE";
export const CHECK_IF_SAFE_CLOSE_WINDOW = "CHECK_IF_SAFE_CLOSE_WINDOW";

// User settings
export const LIMS_HOST = process.env.ELECTRON_WEBPACK_APP_LIMS_HOST || "localhost";
export const LIMS_PORT = process.env.ELECTRON_WEBPACK_APP_LIMS_PORT || "8080";
export const LIMS_PROTOCOL = process.env.ELECTRON_WEBPACK_APP_LIMS_PROTOCOL || "http";

// User setting storage
export const USER_SETTINGS_KEY = "userSettings";

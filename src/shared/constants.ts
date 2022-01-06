import { userInfo } from "os";

// Misc
export const SCHEMA_SYNONYM = "Template";

// Event channels

// emitted by main process when user clicks link to create plate standalone
export const OPEN_CREATE_PLATE_STANDALONE = "OPEN_CREATE_PLATE";

// emitted by main process when user creates a plate through standalone
export const PLATE_CREATED = "PLATE-CREATED";

// emitted by main process when user selects File > Switch Environment
export const SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED =
  "SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED";

// emitted by main process when user tries to exit the app
export const SAFELY_CLOSE_WINDOW = "SAFELY_CLOSE_WINDOW";

// emitted by main process when user selects File > New > Template
export const OPEN_TEMPLATE_MENU_ITEM_CLICKED =
  "OPEN_TEMPLATE_MENU_ITEM_CLICKED";

// emitted by main process when user selects File > Open > Upload Draft
export const OPEN_UPLOAD_DRAFT_MENU_ITEM_CLICKED =
  "OPEN_UPLOAD_DRAFT_MENU_ITEM_CLICKED";

// emitted by main process when user selects File > Save Upload Draft
export const SAVE_UPLOAD_DRAFT_MENU_ITEM_CLICKED =
  "SAVE_UPLOAD_DRAFT_MENU_ITEM_CLICKED";

// emitted by main process when user selects File > Open > Template
export const OPEN_OPEN_TEMPLATE_MODAL = "OPEN_OPEN_TEMPLATE_MODAL";

// emitted by main process when user selects File > Settings
export const OPEN_SETTINGS_EDITOR = "OPEN_SETTINGS_MODAL";

// Default host/port/protocol for LIMS
export const LIMS_HOST =
  process.env.ELECTRON_WEBPACK_APP_LIMS_HOST || "localhost";
export const LIMS_PORT = process.env.ELECTRON_WEBPACK_APP_LIMS_PORT || "8080";
export const LIMS_PROTOCOL =
  process.env.ELECTRON_WEBPACK_APP_LIMS_PROTOCOL || "http";

// Default user
export const DEFAULT_USERNAME = userInfo().username;

// User setting storage
export const USER_SETTINGS_KEY = "userSettings";
export const TEMP_UPLOAD_STORAGE_KEY = "upload";
export const PREFERRED_TEMPLATE_ID = "templateId";

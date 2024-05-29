import { userInfo } from "os";

// Misc
export const SCHEMA_SYNONYM = "Template";

// Events emitted by the main process meant to be received by the renderer process
export enum MainProcessEvents {
  // Emitted when user selects File > Open > Template
  OPEN_OPEN_TEMPLATE_MODAL = "OPEN_OPEN_TEMPLATE_MODAL",

  // Emitted when user selects File > Settings
  OPEN_SETTINGS_EDITOR = "OPEN_SETTINGS_EDITOR",

  // Emitted when user selects File > New > Template
  OPEN_TEMPLATE_MENU_ITEM_CLICKED = "OPEN_TEMPLATE_MENU_ITEM_CLICKED",

  // Emitted when user selects File > Open > Upload Draft
  OPEN_UPLOAD_DRAFT_MENU_ITEM_CLICKED = "OPEN_UPLOAD_DRAFT_MENU_ITEM_CLICKED",

  // Emitted when user creates a plate through standalone
  PLATE_CREATED = "PLATE_CREATED",

  // Emitted when user tries to close the app
  SAFELY_CLOSE_WINDOW = "SAFELY_CLOSE_WINDOW",

  // Emitted when user selects File > Save Upload Draft
  SAVE_UPLOAD_DRAFT_MENU_ITEM_CLICKED = "SAVE_UPLOAD_DRAFT_MENU_ITEM_CLICKED",

  // Emitted when the user selects File > Switch Environment
  SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED = "SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED",
}

// Events emitted by the renderer process meant to be received by the main process
export enum RendererProcessEvents {
  // Emitted when user wants to close the app
  CLOSE_WINDOW = "CLOSE_WINDOW",

  // Emitted when user wants to create a plate within the app (within a standalone browser)
  OPEN_CREATE_PLATE_STANDALONE = "OPEN_CREATE_PLATE_STANDALONE",

  // Emitted when the app needs to refresh
  REFRESH = "REFRESH",

  // Emitted to prompt the user to select files on their system
  SHOW_DIALOG = "SHOW_DIALOG",

  // Emitted to display a native OS message box to the user
  SHOW_MESSAGE_BOX = "SHOW_MESSAGE_BOX",

  // Emitted to prompt the user to save a file somewhere
  SHOW_SAVE_DIALOG = "SHOW_SAVE_DIALOG",
}

// Default host/port/protocol for LIMS
export const LIMS_HOST =
  process.env.ELECTRON_WEBPACK_APP_LIMS_HOST || "localhost";
export const LIMS_PORT = process.env.ELECTRON_WEBPACK_APP_LIMS_PORT || "8080"; // todo all references to electron-webpack need to be rmeoved
export const LIMS_PROTOCOL =
  process.env.ELECTRON_WEBPACK_APP_LIMS_PROTOCOL || "http";

// Default user
export const DEFAULT_USERNAME = userInfo().username;

// User setting storage
export const USER_SETTINGS_KEY = "userSettings";
export const TEMP_UPLOAD_STORAGE_KEY = "upload";
export const PREFERRED_TEMPLATE_ID = "templateId";

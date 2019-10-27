// Misc
export const SCHEMA_SYNONYM = "Column Template";

// Event channels

// emitted by main process when user clicks link to create plate standalone
export const OPEN_CREATE_PLATE_STANDALONE = "OPEN_CREATE_PLATE";

// emitted by main process when user creates a plate through standalone
export const PLATE_CREATED = "PLATE-CREATED";

// emitted by main process when user wants to switch environments
export const SET_LIMS_URL = "SET_LIMS_URL";

// emitted by main process when user tries to exit the app
export const SAFELY_CLOSE_WINDOW = "SAFELY_CLOSE_WINDOW";

// emitted by main process when user selects File > New > Column Template
export const OPEN_TEMPLATE_EDITOR = "OPEN_TEMPLATE_EDITOR";
export const CLOSE_TEMPLATE_EDITOR = "CLOSE_TEMPLATE_EDITOR";

// emitted by main process when user selects File > Open > Column Template
export const OPEN_OPEN_TEMPLATE_MODAL = "OPEN_OPEN_TEMPLATE_MODAL";
export const CLOSE_OPEN_TEMPLATE_MODAL = "CLOSE_OPEN_TEMPLATE_MODAL";

// User settings
export const LIMS_HOST = process.env.ELECTRON_WEBPACK_APP_LIMS_HOST || "localhost";
export const LIMS_PORT = process.env.ELECTRON_WEBPACK_APP_LIMS_PORT || "8080";
export const LIMS_PROTOCOL = process.env.ELECTRON_WEBPACK_APP_LIMS_PROTOCOL || "http";

// User setting storage
export const USER_SETTINGS_KEY = "userSettings";

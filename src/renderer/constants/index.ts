export const APP_ID = "app";
export const DATE_FORMAT = "MM-DD-YYYY";
export const DATETIME_FORMAT = "MM-DD-YYYY, h:mm:ss a";
export const LONG_DATETIME_FORMAT = "lll";
export const LIST_DELIMITER_SPLIT = ",";
export const LIST_DELIMITER_JOIN = ", ";

export enum AnnotationName {
  NOTES = "Notes",
  IMAGING_SESSION = "Imaging Session",
  PLATE_BARCODE = "Plate Barcode",
  WELL = "Well",
  PROGRAM = "Program"
}

// This was calculated by finding an element with the main font size (18px), getting the clientWidth
// and dividing by the number of characters.
export const MAIN_FONT_WIDTH = 8.45; // px

export const MINUTE_AS_MS = 60 * 1000;
export const HOUR_AS_MS = 60 * MINUTE_AS_MS;
export const DAY_AS_MS = 24 * HOUR_AS_MS;

// Delay before mouseover tooltips appear / disappear in seconds
export const TOOLTIP_ENTER_DELAY = 0.5;
export const TOOLTIP_LEAVE_DELAY = 0;

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
  PROGRAM = "Program",
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

// Program annotation ID
export const PROGRAM_ANNOTATION_ID = 153;

// TEMPORARY SOLUTION: these uploads succeeded in FSS but never completed
// FUA's portion; on app start they are synced like abandoned uploads so
// the completion routine runs (send metadata to MMS, mark the FUA job
// SUCCEEDED). Remove once these uploads have gone through.
export const FILE_NAMES_TO_FORCE_RETRY = new Set([
  "3500009020_nikon0_20260807_C11_60.nd2",
  "3500009012_nikon0_20260803_C3_030.nd2",
  "3500009012_nikon0_20260803_D8_073.nd2",
  "3500009012_nikon0_20260803_D7_072.nd2",
  "3500009012_nikon0_20260803_D7_071.nd2",
  "3500009012_nikon0_20260803_D6_068.nd2",
  "3500009012_nikon0_20260803_D7_070.nd2",
  "3500009012_nikon0_20260803_D6_069.nd2",
  "3500009012_nikon0_20260803_D5_065.nd2",
  "3500009012_nikon0_20260803_D6_067.nd2",
  "3500009012_nikon0_20260803_D4_063.nd2",
  "3500009012_nikon0_20260803_D5_064.nd2",
  "3500009012_nikon0_20260803_D5_066.nd2",
  "3500009012_nikon0_20260803_D4_061.nd2",
  "3500009012_nikon0_20260803_D4_062.nd2",
  "3500009012_nikon0_20260803_D3_059.nd2",
  "3500009012_nikon0_20260803_D3_058.nd2",
  "3500009012_nikon0_20260803_D3_060.nd2",
  "3500009012_nikon0_20260803_D2_057.nd2",
  "3500009012_nikon0_20260803_D2_055.nd2",
  "3500009012_nikon0_20260803_D2_056.nd2",
  "3500009012_nikon0_20260803_C11_053.nd2",
  "3500009012_nikon0_20260803_C11_054.nd2",
  "3500009012_nikon0_20260803_C10_051.nd2",
  "3500009012_nikon0_20260803_C10_049.nd2",
  "3500009012_nikon0_20260803_C11_052.nd2",
  "3500009012_nikon0_20260803_C10_050.nd2",
  "3500009012_nikon0_20260803_C9_048.nd2",
  "3500009012_nikon0_20260803_C9_046.nd2",
  "3500009012_nikon0_20260803_C9_047.nd2",
  "3500009012_nikon0_20260803_C8_045.nd2",
  "3500009012_nikon0_20260803_C8_043.nd2",
  "3500009012_nikon0_20260803_C8_044.nd2",
  "3500009012_nikon0_20260803_C7_041.nd2",
  "3500009012_nikon0_20260803_C6_037.nd2",
  "3500009012_nikon0_20260803_C6_039.nd2",
  "3500009012_nikon0_20260803_C5_035.nd2",
  "3500009012_nikon0_20260803_C4_032.nd2",
  "3500009012_nikon0_20260803_C4_031.nd2",
  "3500009012_nikon0_20260803_C5_034.nd2",
]);

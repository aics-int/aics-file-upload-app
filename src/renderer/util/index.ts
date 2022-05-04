import { constants, promises as fsPromises } from "fs";
import { resolve } from "path";

import { trim } from "lodash";
import { flatten, memoize, uniq } from "lodash";

import { LIST_DELIMITER_SPLIT, MAIN_FONT_WIDTH } from "../constants";

/*
 * This file contains pure utility methods with no dependencies on other code
 * in this repo.
 */

/**
 * Splits a string on the list delimiter, trims beginning and trailing whitespace, and filters
 * out falsy values
 * @param {string} value
 * @returns {any[]}
 */
export const splitTrimAndFilter = (value = ""): any[] =>
  value
    .split(LIST_DELIMITER_SPLIT)
    .map(trim)
    .filter((v) => !!v);

// Returns true if the user has read access to the file path given
const canUserRead = async (filePath: string): Promise<boolean> => {
  try {
    await fsPromises.access(filePath, constants.R_OK);
    return true;
  } catch (permissionError) {
    return false;
  }
};

// For each file path determines if the path leads to a directory
// if so it extracts the file paths for the files within said directory
// otherwise just returns the file path as is.
export async function determineFilesFromNestedPaths(
  paths: string[]
): Promise<string[]> {
  const filePaths = await Promise.all(
    paths.flatMap(async (fullPath) => {
      const stats = await fsPromises.stat(fullPath);
      if (!stats.isDirectory()) {
        return [fullPath];
      }
      const canRead = await canUserRead(fullPath);
      if (!canRead) {
        throw new Error(`User does not have permission to read ${fullPath}`);
      }
      const pathsUnderFolder = await fsPromises.readdir(fullPath, {
        withFileTypes: true,
      });
      return pathsUnderFolder
        .filter((f) => f.isFile())
        .map((f) => resolve(fullPath, f.name));
    })
  );

  return uniq(flatten(filePaths));
}

/**
 * Returns largest factor of 1000 for num
 * @param num
 */
export const getPowerOf1000 = (num: number) => {
  let count = 0;
  while (Math.floor(num / 1000) > 0) {
    count++;
    num = num / 1000;
  }
  return count;
};

const getCanvasContext = memoize(() => {
  return window.document.createElement("canvas").getContext("2d");
});

/**
 * Helper for measuring how wide text would be displayed on the page. Defaults to an approximation of the width
 * if it cannot create a canvas context for some reason.
 * @param font https://developer.mozilla.org/en-US/docs/Web/CSS/font
 * @param text the text to be displayed
 */
export const getTextWidth = (font: string, text: string) => {
  const canvasContext = getCanvasContext();
  if (!canvasContext) {
    return text.length * MAIN_FONT_WIDTH;
  }
  canvasContext.font = font;
  return canvasContext.measureText(text).width;
};

export const timeout = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export enum FileType {
  CSV = "csv",
  IMAGE = "image",
  OTHER = "other",
  TEXT = "text",
  ZEISS_CONFIG_FILE = "zeiss-config-file",
}

export const extensionToFileTypeMap: { [index: string]: FileType } = {
  ".csv": FileType.CSV,
  ".czexp": FileType.ZEISS_CONFIG_FILE,
  ".czi": FileType.IMAGE,
  ".czmbi": FileType.ZEISS_CONFIG_FILE,
  ".czsh": FileType.ZEISS_CONFIG_FILE,
  ".gif": FileType.IMAGE,
  ".jpeg": FileType.IMAGE,
  ".jpg": FileType.IMAGE,
  ".pdf": FileType.IMAGE, // TODO: decide if we consider this to be true
  ".png": FileType.IMAGE,
  ".tif": FileType.IMAGE,
  ".tiff": FileType.IMAGE,
  ".txt": FileType.TEXT,
};
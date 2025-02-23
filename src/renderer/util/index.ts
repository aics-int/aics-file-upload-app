import { constants, promises as fsPromises } from "fs";
import { readdir, stat } from 'fs/promises';
import { join } from "path";

import { trim } from "lodash";
import { memoize } from "lodash";

import { LIST_DELIMITER_SPLIT, MAIN_FONT_WIDTH } from "../constants";
import { UploadType } from "../types";

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

/**
 * Takes a list of file paths and checks to see if they can be read and if they match
 *  the given UploadType.
 */
export async function handleFileSelection(
  paths: string[],
  uploadType: UploadType
): Promise<string[]> {
  const filepaths = await Promise.all(
    paths.map(async (fullPath) => {
      const canRead = await canUserRead(fullPath);
      if (!canRead) {
        throw new Error(`User does not have permission to read ${fullPath}`);
      }

      const stats = await fsPromises.stat(fullPath);
      if (uploadType === UploadType.File) {
        if (stats.isDirectory()) {
          throw new Error(`Selected upload type is "${UploadType.File}". Cannot upload folder "${fullPath}".`);
        }
      } else if (uploadType === UploadType.Multifile) {
        if (!stats.isDirectory()) {
          throw new Error(`Selected upload type is "${UploadType.Multifile}". Selected files are expected to be folders. Cannot upload file "${fullPath}".`);
        }
      } else {
        throw new Error(`Selected upload type "${uploadType}" not recognized.`);
      }
      return fullPath;
    })
  );

  return filepaths;
}

/**
 * Returns the total size of a given directory's children, sub-children, etc.
 * If the given path points to a file rather than a directory, returns the size of the file.
 * @param dir Local path to a directory.
 *
 * Borrowed from StackOverflow: https://stackoverflow.com/a/69418940
 */
export async function getDirectorySize(dir: string): Promise<number> {
  const files = await readdir(dir, { withFileTypes: true });

  const paths = files.map(async file => {
    const path = join(dir, file.name);

    if (file.isDirectory()) {
      return await getDirectorySize(path);
    }

    if (file.isFile()) {
      const { size } = await stat(path);
      return size;
    }
    return 0;
  } );

  return (await Promise.all(paths)).flat(Infinity).reduce((i, size) => i + size, 0);
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

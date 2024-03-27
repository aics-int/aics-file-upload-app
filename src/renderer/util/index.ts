import { constants, promises as fsPromises } from "fs";
import { readdir, stat } from 'fs/promises';
import { join, resolve } from "path";

import { trim } from "lodash";
import { flatten, memoize, uniq } from "lodash";

import { LIST_DELIMITER_SPLIT, MAIN_FONT_WIDTH } from "../constants";

///////////////////////////////////////////////////////////////////
// TODO - Remove this once multifile support is feature-complete //
//         Flip the boolean to "true" for testing                //
///////////////////////////////////////////////////////////////////

const USE_MULTIFILE_ASSUMPTION = false;

///////////////////////////////////////////////////////////////////

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

async function determineFilesFromNestedPath(
  path: string
): Promise<string[]> {
  const isMultifile = determineIsMultifile(path);
  const stats = await fsPromises.stat(path);
  if (!stats.isDirectory() || isMultifile) {
    return [path];
  }
  const canRead = await canUserRead(path);
  if (!canRead) {
    throw new Error(`User does not have permission to read ${path}`);
  }
  const pathsUnderFolder = await fsPromises.readdir(path, {
    withFileTypes: true,
  });
  return pathsUnderFolder
    .filter((f) => f.isFile())
    .map((f) => resolve(path, f.name));
}

// For each file path determines if the path leads to a directory
// if so it extracts the file paths for the files within said directory
// otherwise just returns the file path as is.
export async function determineFilesFromNestedPaths(
  paths: string[]
): Promise<string[]> {
  const filePaths = await Promise.all(
    paths.flatMap(async (fullPath) => {
      return determineFilesFromNestedPath(fullPath);
    })
  );

  return uniq(flatten(filePaths));
}

/**
 * Use a given filepath's extension to determine if it is a "multifile".
 * @param filePath Path to the file
 */
export function determineIsMultifile(filePath: string): boolean {
  const multifileExtensions = ['.zarr', '.sldy'];
  const combinedExtensions = multifileExtensions.join('|');

  // "ends with one of the listed extensions, ignoring casing"
  // otherwise written like: /.zarr|.sldy$/i
  const matcher = new RegExp(combinedExtensions + "$", 'i');

  // If the regex matches it will return an array (truthy).
  // If the regex doesn't match it will return null (falsy).
  return Boolean(filePath.match(matcher)) && USE_MULTIFILE_ASSUMPTION;
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

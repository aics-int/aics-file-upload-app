import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import * as rimraf from "rimraf";
import { restore } from "sinon";

import {
  determineFilesFromNestedPaths,
  determineIsMultifile,
  getPowerOf1000,
  splitTrimAndFilter,
} from "../";

describe("General utilities", () => {
  afterEach(() => {
    restore();
  });

  describe("determineFilesFromNestedPaths", () => {
    const MOCK_DIRECTORY = path.resolve(os.tmpdir(), "fuaMockTest");
    const MOCK_FILE1 = path.resolve(MOCK_DIRECTORY, "first_file.txt");
    const MOCK_FILE2 = path.resolve(MOCK_DIRECTORY, "second_file.txt");

    before(async () => {
      await fs.promises.mkdir(MOCK_DIRECTORY);
      await fs.promises.writeFile(MOCK_FILE1, "some text");
      await fs.promises.writeFile(MOCK_FILE2, "some other text");
      await fs.promises.mkdir(path.resolve(MOCK_DIRECTORY, "unwanted folder"));
    });

    after(() => {
      rimraf.sync(MOCK_DIRECTORY);
    });

    it("returns files as is", async () => {
      // Act
      const result = await determineFilesFromNestedPaths([MOCK_FILE1], false); // todo multifile determination should probably be done within this function

      // Assert
      expect(result).to.deep.equal([MOCK_FILE1]);
    });

    it("extracts files underneath folders", async () => {
      // Act
      const result = await determineFilesFromNestedPaths([
        MOCK_DIRECTORY,
        MOCK_FILE1,
      ], false); // todo multifile determination should probably be done within this function

      // Assert
      expect(result).to.deep.equal([MOCK_FILE1, MOCK_FILE2]);
    });
  });

  describe("determineIsMultifile", () => {
    it("returns true when files have expected extensions", () => {
      // Arrange
      const MOCK_FILE1 = "file.sldy";
      const MOCK_FILE2 = "file.zarr";

      // Act
      const result1 = determineIsMultifile(MOCK_FILE1);
      const result2 = determineIsMultifile(MOCK_FILE2);

      // Assert
      expect(result1).to.equal(true);
      expect(result2).to.equal(true);
    });

    it("returns false when files do not have expected extensions", () => {
      // Arrange
      const MOCK_FILE1 = "image.png";

      // Act
      const result = determineIsMultifile(MOCK_FILE1);

      // Assert
      expect(result).to.equal(false);
    });
  });

  describe("splitTrimAndFilter", () => {
    it("splits string on commas, trims whitespace", () => {
      const result = splitTrimAndFilter("abc, de ,fg");
      expect(result).to.deep.equal(["abc", "de", "fg"]);
    });
    it("returns empty array give comma", () => {
      const result = splitTrimAndFilter(",");
      expect(result).to.deep.equal([]);
    });
  });

  describe("getPowerOf1000", () => {
    it("returns 0 if input is 9", () => {
      expect(getPowerOf1000(9)).to.equal(0);
    });
    it("returns 1 if input is 1001", () => {
      expect(getPowerOf1000(1001)).to.equal(1);
    });
    it("returns 1 if input is 999999", () => {
      expect(getPowerOf1000(999999)).to.equal(1);
    });
  });
});

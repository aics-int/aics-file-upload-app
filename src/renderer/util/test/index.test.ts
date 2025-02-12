import * as fs from "fs";
import { promises as fsPromises } from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import * as rimraf from "rimraf";
import { restore, SinonStub, stub } from "sinon";

import {
  getDirectorySize,
  getPowerOf1000,
  handleFileSelection,
  splitTrimAndFilter,
} from "../";
import { UploadType } from "../../types";

describe("General utilities", () => {
  afterEach(() => {
    restore();
  });

  describe("getDirectorySize", () => {
    const MOCK_DIRECTORY = path.resolve(os.tmpdir(), "fuaMockTest");

    after(() => {
      rimraf.sync(MOCK_DIRECTORY);
    });

    it("correctly calculates directory size", async () => {
      // Arrange
      // create a directory containing one file and a sub-directory that also contains one file
      await fs.promises.mkdir(MOCK_DIRECTORY);

      const SUB_DIR = path.resolve(MOCK_DIRECTORY, "subDir");
      await fs.promises.mkdir(SUB_DIR);

      const FILE_1 = path.resolve(MOCK_DIRECTORY, "file1.txt");
      const FILE_2 = path.resolve(SUB_DIR, "file2.txt");

      // use a 10 byte array to create files that are each 10 bytes
      const byteArray = new Int8Array(10);

      await fs.promises.writeFile(FILE_1, byteArray);
      await fs.promises.writeFile(FILE_2, byteArray)

      // Act
      const result = await getDirectorySize(MOCK_DIRECTORY);

      // Assert
      // two 10-byte files -> 20 bytes total size
      expect(result).to.equal(20);
    })
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

  describe("handleFileSelection", () => {
    // fs.access is used by "canUserRead()" internally
    let fsAccessStub: SinonStub;
    let fsStatStub: SinonStub;

    beforeEach(() => {
      fsAccessStub = stub(fsPromises, 'access');
      fsStatStub = stub(fsPromises, 'stat');
    });

    afterEach(() => {
      fsAccessStub.restore();
      fsStatStub.restore();
    });

    it("returns given file path if uploadType is 'File' and selected path is a file", async () => {
      const filePaths = ['file.txt'];
      const uploadType = UploadType.File;

      fsAccessStub.resolves();
      fsStatStub.resolves({ isDirectory: () => false });

      const actual = await handleFileSelection(filePaths, uploadType);
      expect(actual).to.have.members(filePaths);
    });

    it("returns given file path if uploadType is 'Multifile' and selected path is a folder", async () => {
      const filePaths = ['file.txt'];
      const uploadType = UploadType.Multifile;

      fsAccessStub.resolves();
      fsStatStub.resolves({ isDirectory: () => true });

      const actual = await handleFileSelection(filePaths, uploadType);
      expect(actual).to.have.members(filePaths);
    });

    it("throws an error if user does not have file read acccess", async () => {
      const filePaths = ['file.txt'];
      const uploadType = UploadType.File;

      fsAccessStub.rejects();
      fsStatStub.resolves({ isDirectory: () => false });

      await expect(handleFileSelection(filePaths, uploadType)).to.be
          .rejectedWith('User does not have permission to read file.txt');
    });

    it("throws an error if upload type is 'File' and uploaded path is a folder", async () => {
      const filePaths = ['/path/to/folder'];
      const uploadType = UploadType.File;

      fsAccessStub.resolves();
      fsStatStub.resolves({ isDirectory: () => true });

      await expect(handleFileSelection(filePaths, uploadType as any)).to.be
          .rejectedWith(`Selected upload type is "${uploadType}". Cannot upload folder "${filePaths[0]}".`);
    });

    it("throws an error if upload type is 'Multifile' and uploaded path is a file", async () => {
      const filePaths = ['file.txt'];
      const uploadType = UploadType.Multifile;

      fsAccessStub.resolves();
      fsStatStub.resolves({ isDirectory: () => false });

      await expect(handleFileSelection(filePaths, uploadType as any)).to.be
          .rejectedWith(`Selected upload type is "${uploadType}". Selected files are expected to be folders. Cannot upload file "${filePaths[0]}".`);
    });

    it("throws an error if uploadType is not recognized", async () => {
      const filePaths = ['file.txt'];
      const uploadType = "InvalidUploadType";

      fsAccessStub.resolves();
      fsStatStub.resolves({ isDirectory: () => false });

      await expect(handleFileSelection(filePaths, uploadType as any)).to.be
          .rejectedWith('Selected upload type "InvalidUploadType" not recognized.');
    });
  })
});

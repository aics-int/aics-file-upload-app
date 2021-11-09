import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import { noop } from "lodash";

import ChunkedFileReader, { CancellationError } from "../ChunkedFileReader";

describe("ChunkedFileReader", () => {
  const fileReader = new ChunkedFileReader();
  const mockUploadId = "234134123";
  const testDir = path.resolve(os.tmpdir(), "chunked-file-reader-test");
  const testFilePath = path.resolve(testDir, "md5-test.txt");

  beforeEach(async () => {
    await fs.promises.mkdir(testDir);
    // Generate file with 50MB of "random" bytes
    await fs.promises.writeFile(
      testFilePath,
      Buffer.allocUnsafe(1024 * 1024 * 2)
    );
  });

  afterEach(async () => {
    await fs.promises.rmdir(testDir, { recursive: true });
  });

  describe("calculateMD5", () => {
    it("produces expected MD5", async () => {
      // Arrange
      const source = path.resolve(testDir, "test-small-consistent-md5.txt");
      const expected = "99d729c7ca431a2df97778cc3ff7696a";

      // Act
      await fs.promises.writeFile(source, "some test file");
      const actual = await fileReader.calculateMD5(mockUploadId, source, noop);

      // Assert
      expect(actual).to.equal(expected);
    });

    it("produces same MD5 each time", async () => {
      // Act
      const firstMD5 = await fileReader.calculateMD5(
        mockUploadId,
        testFilePath,
        noop
      );
      const secondMD5 = await fileReader.calculateMD5(
        mockUploadId,
        testFilePath,
        noop
      );
      const thirdMD5 = await fileReader.calculateMD5(
        mockUploadId,
        testFilePath,
        noop
      );

      // Assert
      expect(firstMD5).to.equal(secondMD5);
      expect(secondMD5).to.equal(thirdMD5);
    });
  });

  describe("read", () => {
    it("starts byte read at offset", async () => {
      // Arrange
      const { size } = await fs.promises.stat(testFilePath);
      const offset = 23;
      let totalBytesRead = 0;
      const onProgress = (chunk: Uint8Array) => {
        totalBytesRead += chunk.byteLength;
        return Promise.resolve();
      };

      // Act
      await fileReader.read(
        mockUploadId,
        testFilePath,
        onProgress,
        100,
        offset
      );

      // Assert
      expect(totalBytesRead).to.equal(size - offset);
    });

    it("yields chunks no larger than chunk size specified", async () => {
      // Arrange
      const chunkSize = 1024;
      const onProgress = (chunk: Uint8Array) => {
        // Assert
        expect(chunk.byteLength).to.be.lessThan(chunkSize + 1);
        return Promise.resolve();
      };

      // Act
      await fileReader.read(mockUploadId, testFilePath, onProgress, 100, 0);
    });

    it("sends expected amount of bytes to callback", async () => {
      // Arrange
      const { size: expectedBytes } = await fs.promises.stat(testFilePath);
      let totalBytesRead = 0;
      const onProgress = (chunk: Uint8Array) => {
        totalBytesRead += chunk.byteLength;
        return Promise.resolve();
      };

      // Act
      await fileReader.read(mockUploadId, testFilePath, onProgress, 1000, 0);

      // Assert
      expect(totalBytesRead).to.equal(expectedBytes);
    });

    it("provides bytes necessary to recreate file exactly", async () => {
      // Arrange
      const md5OfOriginalFile = await fileReader.calculateMD5(
        "12394124",
        testFilePath,
        noop
      );
      const chunks: Uint8Array[] = [];
      const onProgress = (chunk: Uint8Array) => {
        chunks.push(chunk);
        return Promise.resolve();
      };

      // Act
      await fileReader.read(mockUploadId, testFilePath, onProgress, 1000, 0);

      // (sanity-check) Ensure we have multiple chunks to combine
      expect(chunks.length).to.be.greaterThan(1);

      // Assert
      const recreatedFilePath = path.resolve(testDir, "recreated-file-test");
      await fs.promises.writeFile(recreatedFilePath, Buffer.concat(chunks));
      const md5OfRecreatedFile = await fileReader.calculateMD5(
        "103941234",
        recreatedFilePath,
        noop
      );
      expect(md5OfRecreatedFile).to.equal(md5OfOriginalFile);
    });
  });

  describe("cancel", () => {
    it("cancels MD5 calculations", async () => {
      // Arrange
      const calculateMD5 = (uploadId: string) =>
        fileReader.calculateMD5(uploadId, testFilePath, noop);
      const promise = calculateMD5(mockUploadId);

      // Act
      fileReader.cancel(mockUploadId);

      // Assert
      await expect(promise).to.be.rejectedWith(CancellationError);

      // (sanity-check) Does not reject non-canceled calculations
      await expect(calculateMD5("12903123")).to.not.be.rejectedWith(
        CancellationError
      );
    });

    it("cancels reads", async () => {
      // Arrange
      const onProgress = () => Promise.resolve();
      const read = (uploadId: string) =>
        fileReader.read(uploadId, testFilePath, onProgress, 1000, 0);
      const promise = read(mockUploadId);

      // Act
      fileReader.cancel(mockUploadId);

      // Assert
      await expect(promise).to.be.rejectedWith(CancellationError);

      // (sanity-check) Does not reject non-canceled reads
      await expect(read("12903123")).to.not.be.rejectedWith(CancellationError);
    });

    it("cancels md5 calculation with custom error", async () => {
      // Arrange
      const error = new Error("my special error");
      const calculateMD5 = (uploadId: string) =>
        fileReader.calculateMD5(uploadId, testFilePath, noop);
      const promise = calculateMD5(mockUploadId);

      // Act
      fileReader.cancel(mockUploadId, error);

      // Assert
      await expect(promise).to.be.rejectedWith(error);

      // (sanity-check) Does not reject non-canceled calculations
      await expect(calculateMD5("12903123")).to.not.be.rejectedWith(error);
    });

    it("cancels read with custom error", async () => {
      // Arrange
      const error = new Error("my special error");
      const onProgress = () => Promise.resolve();
      const read = (uploadId: string) =>
        fileReader.read(uploadId, testFilePath, onProgress, 1000, 0);
      const promise = read(mockUploadId);

      // Act
      fileReader.cancel(mockUploadId, error);

      // Assert
      await expect(promise).to.be.rejectedWith(error);

      // (sanity-check) Does not reject non-canceled reads
      await expect(read("12903123")).to.not.be.rejectedWith(error);
    });
  });
});

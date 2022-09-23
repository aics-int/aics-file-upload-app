import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import * as CryptoJS from "crypto-js";

import ChunkedFileReader, { CancellationError } from "../ChunkedFileReader";
import { noop } from "lodash";

describe("ChunkedFileReader", () => {
  const fileReader = new ChunkedFileReader();
  const mockUploadId = "234134123";
  const testDir = path.resolve(os.tmpdir(), "chunked-file-reader-test");
  const testFilePath = path.resolve(testDir, "md5-test.txt");

  before(async () => {
    await fs.promises.mkdir(testDir);
    // Generate file with 2MB of "random" bytes
    await fs.promises.writeFile(
      testFilePath,
      Buffer.allocUnsafe(1024 * 1024 * 2)
    );
  });

  after(async () => {
    await fs.promises.rm(testDir, { recursive: true });
  });

  describe("read", () => {

    // it("it resumes md5 computation as expected (string mode)", () => {
    //   // Arrange
    //   const originalHash = crypto.createHash("md5");
    //   originalHash.update(Buffer.from([1, 24, 945, 10532, 54, 349, 8359]));
    //   const hashFromOriginal = originalHash.digest('hex');

    //   // Act
    //   const newHash = crypto.createHash("md5");
    //   newHash.update(hashFromOriginal, 'hex');
    //   const hashFromNewStream = newHash.digest("hex");

    //   // Assert
    //   expect(hashFromNewStream).to.equal(hashFromOriginal);
    // })

    // it("it resumes md5 computation as expected (byte mode)", () => {
    //   // Arrange
    //   const originalHash = crypto.createHash("md5");
    //   originalHash.update(Buffer.from([1, 24, 945, 10532, 54, 349, 8359]));
    //   const bufferFromOriginal = originalHash.digest().toJSON();

    //   // Act
    //   const newHash = crypto.createHash("md5");
    //   newHash.update(Buffer.from(bufferFromOriginal as any));
    //   const hashFromNewStream = newHash.digest().toJSON();

    //   // Assert
    //   expect(hashFromNewStream).to.equal(bufferFromOriginal);
    // })

    it("it calculates md5 correctly starting from a partial (seialized) md5", async () => {
      // Arrange
      let chunkNumber = 0;
      const stoppedChunkNum = 3;
      const chunkSize = 100;
      let partiallyCalculatedMd5: string | undefined;
      const onProgress = (_: Uint8Array, partialMd5: string) => {
        chunkNumber += 1;
        if(chunkNumber === stoppedChunkNum){
          partiallyCalculatedMd5 = partialMd5;
        }
        return Promise.resolve();
      };

      // Act
      const expectedMd5 = await fileReader.read({
        uploadId: mockUploadId,
        source: testFilePath,
        onProgress,
        chunkSize,
        offset: 0
    });

      const actualMd5 = await fileReader.read({
        uploadId: mockUploadId,
        source: testFilePath,
        onProgress,
        chunkSize,
        offset: stoppedChunkNum * chunkSize,
        partiallyCalculatedMd5
    });

      // Assert
      expect(actualMd5).to.not.be.empty
      expect(actualMd5).to.equal(expectedMd5);
    });

    // it("it resumes md5 computation as expected",async () => {
    //   const someBuffer = Buffer.from([3,23,54,66,21,4,66,7]);
    //   const hashStream1 = crypto.createHash("md5").setEncoding("hex");
    //   const hashStream2 = crypto.createHash("md5").setEncoding("hex");

    //   hashStream1.update(someBuffer); 
    //   hashStream2.update(Buffer.from(someBuffer.toJSON() as any)); // TODO: Does this work?
      
    //   const md51 = hashStream1.digest('hex');
    //   const md52 = hashStream2.digest('hex');

    //   expect(md51).to.not.be.empty
    //   expect(md51).to.equal(md52);

    // })

    // it("it consistently creates the same MD5 from the same bytes", async () => {
    //   // Arrange
    //   const onProgress = (_: Uint8Array, partialMd5: string) => {
    //     return Promise.resolve();
    //   };

    //   // Act
    //   const expectedMd5 = await fileReader.read(
    //     mockUploadId,
    //     testFilePath,
    //     onProgress,
    //     100,
    //     0
    //   );

    //   const actualMd5 = await fileReader.read(
    //     mockUploadId,
    //     testFilePath,
    //     onProgress,
    //     100,
    //     0,
    //   );

    //   // Assert
    //   expect(actualMd5).to.not.be.empty
    //   expect(actualMd5).to.equal(expectedMd5);
    // });

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
      await fileReader.read({
        uploadId: mockUploadId,
        source: testFilePath,
        onProgress,
        chunkSize: 100,
        offset
    });

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
      await fileReader.read({
        uploadId: mockUploadId, 
        source: testFilePath, 
        onProgress, 
        chunkSize: 100, 
        offset: 0
      });
    });

    it("sends expected amount and size of bytes to callback", async () => {
      // Arrange
      const { size: expectedBytes } = await fs.promises.stat(testFilePath);
      let totalBytesRead = 0;
      const chunkSize = 1000;
      const onProgress = (chunk: Uint8Array) => {
        totalBytesRead += chunk.byteLength;
        const isLastChunk = totalBytesRead === expectedBytes;
        if (isLastChunk) {
          expect(chunk.byteLength).to.equal(expectedBytes % chunkSize);
        } else {
          expect(chunk.byteLength).to.equal(chunkSize);
        }
        return Promise.resolve();
      };

      // Act
      await fileReader.read({
        uploadId: mockUploadId,
        source: testFilePath,
        onProgress,
        chunkSize,
        offset: 0
    });

      // Assert
      expect(totalBytesRead).to.equal(expectedBytes);
    });

    it("provides bytes necessary to recreate file exactly", async () => {
      // Arrange
      const chunks: Uint8Array[] = [];
      const onProgress = (chunk: Uint8Array) => {
        chunks.push(chunk);
        return Promise.resolve();
      };

      // Act
      const md5OfOriginalFile = await fileReader.read({
        uploadId: mockUploadId, 
        source: testFilePath, 
        onProgress, 
        chunkSize: 1000, 
        offset: 0
      });

      // (sanity-check) Ensure we have multiple chunks to combine
      expect(chunks.length).to.be.greaterThan(1);

      // Assert
      const recreatedFilePath = path.resolve(testDir, "recreated-file-test");
      await fs.promises.writeFile(recreatedFilePath, Buffer.concat(chunks));
      const md5OfRecreatedFile = await fileReader.read({
        uploadId: "103941234",
        source: recreatedFilePath,
        onProgress: () => Promise.resolve(), 
        chunkSize: 1000, 
        offset: 0
    });
      expect(md5OfRecreatedFile).to.equal(md5OfOriginalFile);
    });

    it("provides bytes necessary to recreate file exactly, starting from second chunk using partial MD5", async () => {
      // Arrange
      const chunkSize = 1000;
      const chunks: Uint8Array[] = [];
      let partialMd5;
      const onProgress = (chunk: Uint8Array, hashThusFar: string) => {
        if(!chunks.length){
          partialMd5 = hashThusFar;
        }
        chunks.push(chunk);
        return Promise.resolve();
      };

      // Act
      const md5OfOriginalFile = await fileReader.read({
        uploadId: mockUploadId, 
        source: testFilePath, 
        onProgress, 
        chunkSize, 
        offset: 0
      });

      // (sanity-check) Ensure we have multiple chunks to combine
      expect(chunks.length).to.be.greaterThan(1);

      // Assert
      const recreatedFilePath = path.resolve(testDir, "recreated-file-test");
      await fs.promises.writeFile(recreatedFilePath, Buffer.concat(chunks));
      const md5OfRecreatedFile = await fileReader.read({
        uploadId: "103941234",
        source: recreatedFilePath,
        onProgress: () => Promise.resolve(), 
        chunkSize, 
        offset: chunkSize, //Because this is starting after the first chunk
        partiallyCalculatedMd5: partialMd5
    });
      expect(md5OfRecreatedFile).to.equal(md5OfOriginalFile);
    });

  });

  describe("cancel", () => {
    it("cancels with default error", async () => {
      // Arrange
      let wasCancelled = false;
      const readFunc = (uploadId: string) =>
        fileReader.read({
          uploadId, 
          source: testFilePath, 
          onProgress: async () => {
            if(!wasCancelled){
              // Act
              wasCancelled = fileReader.cancel(mockUploadId);
            }
          },
          offset: 0,
          chunkSize: 1000
        });

      // Assert
      await expect(readFunc(mockUploadId)).to.be.rejectedWith(CancellationError);
      expect(wasCancelled).to.be.true;

      // (sanity-check) Does not reject non-canceled calculations
      await expect(readFunc("12903123")).to.not.be.rejectedWith(
        CancellationError
      );
    });

    it.only("cancels with custom error", async () => {
      // Arrange
      const error = new Error("my special error");
      let wasCancelled = false;
      const readFunc = (uploadId: string) =>
        fileReader.read({
          uploadId, 
          source: testFilePath, 
          onProgress: async () => {
            if(!wasCancelled){
              // Act
              wasCancelled = fileReader.cancel(mockUploadId, error);
            }
          },
          offset: 0,
          chunkSize: 1000
        });

      // Assert
      await expect(readFunc(mockUploadId)).to.be.rejectedWith(error);
      expect(wasCancelled).to.be.true;

      // (sanity-check) Does not reject non-canceled calculations
      await expect(readFunc("12903123")).to.not.be.rejectedWith(error);
    });
  });
});

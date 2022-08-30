import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import * as CryptoJS from "crypto-js";

import ChunkedFileReader from "../ChunkedFileReader";

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

  // describe("calculateMD5", () => {
  //   it("produces expected MD5", async () => {
  //     // Arrange
  //     const source = path.resolve(testDir, "test-small-consistent-md5.txt");
  //     const expected = "99d729c7ca431a2df97778cc3ff7696a";

  //     // Act
  //     await fs.promises.writeFile(source, "some test file");
  //     const actual = await fileReader.calculateMD5(mockUploadId, source, noop);

  //     // Assert
  //     expect(actual).to.equal(expected);
  //   });

  //   it("produces same MD5 each time", async () => {
  //     // Act
  //     const firstMD5 = await fileReader.calculateMD5(
  //       mockUploadId,
  //       testFilePath,
  //       noop
  //     );
  //     const secondMD5 = await fileReader.calculateMD5(
  //       mockUploadId,
  //       testFilePath,
  //       noop
  //     );
  //     const thirdMD5 = await fileReader.calculateMD5(
  //       mockUploadId,
  //       testFilePath,
  //       noop
  //     );

  //     // Assert
  //     expect(firstMD5).to.equal(secondMD5);
  //     expect(secondMD5).to.equal(thirdMD5);
  //   });
  // });

  describe("read", () => {

    it("test using crypto-js", () => {
      function serializeMd5(md5: any) {
        return JSON.stringify(md5);
      }

      function deserializeMd5(serialized_md5: any) {
        const md5 = CryptoJS.algo.MD5.create();

        /** Recursively copy properties from object source to object target. */
        function restore_data(source: any, target: any) {
          for (const prop in source) {
              const value = source[prop];
              if (typeof value === "object") {
                  if (typeof target[prop] !== "object") {
                      target[prop] = {};
                  }
                  restore_data(source[prop], target[prop]);
              } else {
                  target[prop] = source[prop];
              }
          }
        }

        restore_data(JSON.parse(serialized_md5), md5);
        return md5;    
      }

      const chunk1 = "abc"
      const chunk2 = "def";

      // The correct hash:
      const controlMd5 = CryptoJS.algo.MD5.create();
      controlMd5.update(chunk1);
      controlMd5.update(chunk2);
      const expectedHash = controlMd5.finalize().toString();

      // Using stringify/parse
      const initialTestMd5 = CryptoJS.algo.MD5.create();
      initialTestMd5.update(chunk1);
      const serializedMd5 = serializeMd5(initialTestMd5);
      const resumedTestMd5 = deserializeMd5(serializedMd5);
      resumedTestMd5.update(chunk2);
      const actualHash = resumedTestMd5.finalize().toString();

      expect(actualHash).to.not.be.empty;
      expect(expectedHash).to.equal(actualHash);
    })

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
      const expectedMd5 = await fileReader.read(
        mockUploadId,
        testFilePath,
        onProgress,
        chunkSize,
        0
      );

      const actualMd5 = await fileReader.read(
        mockUploadId,
        testFilePath,
        onProgress,
        chunkSize,
        stoppedChunkNum * chunkSize,
        partiallyCalculatedMd5
      );

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
      await fileReader.read(
        mockUploadId,
        testFilePath,
        onProgress,
        chunkSize,
        0
      );

      // Assert
      expect(totalBytesRead).to.equal(expectedBytes);
    });
  }
  //   it("provides bytes necessary to recreate file exactly", async () => {
  //     // Arrange
  //     const md5OfOriginalFile = await fileReader.calculateMD5(
  //       "12394124",
  //       testFilePath,
  //       noop
  //     );
  //     const chunks: Uint8Array[] = [];
  //     const onProgress = (chunk: Uint8Array) => {
  //       chunks.push(chunk);
  //       return Promise.resolve();
  //     };

  //     // Act
  //     await fileReader.read(mockUploadId, testFilePath, onProgress, 1000, 0);

  //     // (sanity-check) Ensure we have multiple chunks to combine
  //     expect(chunks.length).to.be.greaterThan(1);

  //     // Assert
  //     const recreatedFilePath = path.resolve(testDir, "recreated-file-test");
  //     await fs.promises.writeFile(recreatedFilePath, Buffer.concat(chunks));
  //     const md5OfRecreatedFile = await fileReader.calculateMD5(
  //       "103941234",
  //       recreatedFilePath,
  //       noop
  //     );
  //     expect(md5OfRecreatedFile).to.equal(md5OfOriginalFile);
  //   });
  // });

  // describe("cancel", () => {
  //   it("cancels with default error", async () => {
  //     // Arrange
  //     const calculateMD5 = (uploadId: string) =>
  //       fileReader.calculateMD5(uploadId, testFilePath, noop);
  //     const promise = calculateMD5(mockUploadId);

  //     // Act
  //     const wasCancelled = fileReader.cancel(mockUploadId);

  //     // Assert
  //     expect(wasCancelled).to.be.true;
  //     await expect(promise).to.be.rejectedWith(CancellationError);

  //     // (sanity-check) Does not reject non-canceled calculations
  //     await expect(calculateMD5("12903123")).to.not.be.rejectedWith(
  //       CancellationError
  //     );
  //   });

  //   it("cancels with custom error", async () => {
  //     // Arrange
  //     const error = new Error("my special error");
  //     const calculateMD5 = (uploadId: string) =>
  //       fileReader.calculateMD5(uploadId, testFilePath, noop);
  //     const promise = calculateMD5(mockUploadId);

  //     // Act
  //     const wasCancelled = fileReader.cancel(mockUploadId, error);

  //     // Assert
  //     expect(wasCancelled).to.be.true;
  //     await expect(promise).to.be.rejectedWith(error);

  //     // (sanity-check) Does not reject non-canceled calculations
  //     await expect(calculateMD5("12903123")).to.not.be.rejectedWith(error);
  //   });
  // });
)});

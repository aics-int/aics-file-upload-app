import * as crypto from "crypto";
import * as fs from "fs";
import * as stream from "stream";

import BatchedTaskQueue from "../../entities/BatchedTaskQueue";

export type SerializedBuffer = {
  type: 'Buffer';
  data: number[];
}

// Create an explicit error class to capture cancellations
export class CancellationError extends Error {
  constructor() {
    super("File copy cancelled by user.");
    this.name = "CancellationError";
  }
}

/**
 * File reader capable of reading a given file in chunks sending
 * back said chunks in the specified callback or computing the chunks
 * into an MD5
 */
export default class ChunkedFileReader {
  // Time to delay any throttled callbacks
  public static readonly THROTTLE_DELAY_IN_MS = 200;
  // The highWaterMark which deteremines the chunk sizes read by the reader
  // is largely a maximum not a guaranteed amount. On the first chunk read
  // the chunk size will be 1128 bytes instead of the highWaterMark max
  public static readonly FIRST_CHUNK_LENGTH_MAX = 1128;

  // Map of uploadIds to streams to allow cancellations/cleanup
  private readonly uploadIdToStreamMap: {
    [jobId: string]: {
      readStream: fs.ReadStream;
      progressStream?: stream.Transform;
      hashStream?: crypto.Hash;
    };
  } = {};

  /**
   * Reads the given file at the 'source'. Each chunk, of 'chunkSize' size
   * read will be sent back in the given 'onProgress' callback. The starting
   * point for the file read may be offset from the first byte using the 'offset'
   * parameter.
   * 
   * Returns the MD5 hash of the file upon resolution. This MD5 is calculated
   * while the file is read.
   *
   * The file read is tracked by the given 'uploadId' and may be
   * cancelled at any time.
   */
  public async read(
    uploadId: string,
    source: string,
    onProgress: (chunk: Uint8Array, hashThusFar: SerializedBuffer) => Promise<void>,
    chunkSize: number,
    offset: number,
    partiallyCalculatedMd5?: SerializedBuffer
  ): Promise<string> {
    const readStream = fs.createReadStream(source, {
      // Offset the start byte by the offset param
      start: offset,
      // Control the MAX amount of bytes we read at a time
      // not necessarily guaranteed
      highWaterMark: chunkSize,
    });


    const hashStream = crypto.createHash("md5").setEncoding("hex");
    if (partiallyCalculatedMd5) {
      try{
        const acc: number[] = [];
        const reduceFunc = (accumulator: number[], index: number): number[] => {
          accumulator[index] = partiallyCalculatedMd5.data[index];
          return accumulator;
        };
        const partialMd5Arr = Object.keys(partiallyCalculatedMd5.data).reduce(reduceFunc as any, acc);
        hashStream.update(Buffer.from(partialMd5Arr as any)); // TODO: Does this work?
      } catch(error){
        console.log(error);
      }
    }

    // The client of this entity requires a specific chunkSize each time
    // however, streams do not guarantee an exact size each time so this
    // will act as a buffer for excess bytes that don't quite meet the chunk
    // size expectation between reads
    let excessBytes = new Uint8Array();

    let bytesRead = offset;
    const { size: fileSize } = await fs.promises.stat(source);
    const progressStream = new stream.Transform({
      transform(chunk: Uint8Array, _, callback) {
        try {
          if(bytesRead === 16000000){ // should be true on chunk 3
            console.log("serializing then rehydrating hashStream");
            console.log(bytesRead);
            const serializedTest = hashStream.copy().digest('hex');//.toJSON()
            console.log(serializedTest);
            hashStream.update(serializedTest, 'hex');
          }
          hashStream.update(chunk);
          bytesRead += chunk.byteLength;
          const totalBytes = Buffer.concat([excessBytes, chunk]);

          // Split the total chunks currently in memory here into chunks
          // of equal sizing equal to the given chunk size specification
          const chunks: Uint8Array[] = [];
          for (
            let i = 0;
            i < Math.floor(totalBytes.byteLength / chunkSize);
            i++
          ) {
            const chunkRangeStart = i * chunkSize;
            const chunkRangeEnd = chunkRangeStart + chunkSize;
            chunks.push(totalBytes.slice(chunkRangeStart, chunkRangeEnd));
          }

          // Make note of the excess bytes from this chunk read that will
          // need to be carried over into the next read
          excessBytes = totalBytes.slice(
            totalBytes.byteLength - (totalBytes.byteLength % chunkSize)
          );

          // If this in the last chunk read add the excess bytes to the chunks to send off
          const isLastChunk = fileSize === bytesRead;
          if (isLastChunk && excessBytes.byteLength > 0) {
            chunks.push(excessBytes);
          }

          // If the chunk reads are too small to meet our chunk size there is no
          // progress update to send yet
          if (chunks.length === 0) {
            callback();
          } else {
            // Otherwise, run each chunk progress update consecutively
            // failing at the first failure
            
            const serializePartialMd5 = hashStream.copy().digest().toJSON();
            const progressUpdates = chunks.map((c) => () => onProgress(c, serializePartialMd5 as any));
            const progressUpdateQueue = new BatchedTaskQueue(
              progressUpdates,
              1
            );
            progressUpdateQueue
              .run()
              .then(() => callback())
              .catch((err) => callback(err));
          }
        } catch (err) {
          callback(err);
        }
      },
    });
    // Add streams to mapping of in progress reads
    this.uploadIdToStreamMap[uploadId] = {
      readStream,
      hashStream,
      progressStream,
    };

    // Create promise for upload & promise for MD5 calculation
    await new Promise<void>((resolve, reject) => {
      // Send source bytes to destination and track progress
      stream.pipeline(readStream, progressStream, (error) => {
        if (error) {
          // Ensure the streams close on error
          this.cancel(uploadId, error);
          reject(error);
        } else {
          resolve();
        }
      });
    });
    // TODO: Test combining streams
    // const md5CalcPromise = new Promise<void>((resolve, reject) => {
    //   // Calculate MD5
    //   stream.pipeline(readStream, hashStream, (error) => {
    //     if (error) {
    //       delete this.uploadIdToStreamMap[uploadId];
    //       reject(error);
    //     } else {
    //       resolve();
    //     }
    //   });
    // });

    // Wait for read, upload, md5 calculation to complete
    // await Promise.all([uploadPromise, md5CalcPromise]);

    // Remove streams from in progress mapping
    delete this.uploadIdToStreamMap[uploadId];

    // Return MD5 hash of file read
    return hashStream.digest('hex');
  }

  /**
   * Cancel any ongoing file read or computation streams
   * tied to the upload emitting the given error if
   * relevant, the default error is a CancellationError.
   */
  public cancel(
    uploadId: string,
    error: Error = new CancellationError()
  ): boolean {
    const isUploadTracked = uploadId in this.uploadIdToStreamMap;
    if (isUploadTracked) {
      // Detach the read stream from the downstream streams first
      this.uploadIdToStreamMap[uploadId].readStream.unpipe();
      // Destroy the downstream streams emitting an error if possible
      this.uploadIdToStreamMap[uploadId].progressStream?.destroy(error);
      this.uploadIdToStreamMap[uploadId].hashStream?.destroy(error);
      delete this.uploadIdToStreamMap[uploadId];
    }
    return isUploadTracked;
  }
}

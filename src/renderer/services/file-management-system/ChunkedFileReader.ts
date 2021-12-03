import * as crypto from "crypto";
import * as fs from "fs";
import * as stream from "stream";

import { throttle } from "lodash";

import BatchedTaskQueue from "../../entities/BatchedTaskQueue";

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
      writeStream?: fs.WriteStream;
      progressStream?: stream.Transform;
      hashStream?: crypto.Hash;
    };
  } = {};

  /**
   * Calculates the MD5 hash of the file at the 'source'. Each chunk,
   * of 'chunkSize' size read will be sent back in the given
   * 'onProgress' callback.
   *
   * The file read is tracked by the given 'uploadId' and may be
   * cancelled at any time.
   */
  public async calculateMD5(
    uploadId: string,
    source: string,
    onProgress: (bytesRead: number) => void
  ): Promise<string> {
    const readStream = fs.createReadStream(source);
    const hashStream = crypto.createHash("md5").setEncoding("hex");
    let bytesCopied = 0;

    // Throttle the progress callback to avoid overwhelming during fast reads
    const throttledOnProgress = throttle(
      onProgress,
      ChunkedFileReader.THROTTLE_DELAY_IN_MS
    );

    // Create progress stream for sending updates while reading
    const progressStream = new stream.Transform({
      transform(chunk, _, callback) {
        bytesCopied += chunk.length;
        throttledOnProgress(bytesCopied);
        callback(null, chunk);
      },
    });

    // Add streams to mapping of in progress reads
    this.uploadIdToStreamMap[uploadId] = {
      readStream,
      hashStream,
      progressStream,
    };

    // Wait for stream pipeline to finish
    await new Promise<void>((resolve, reject) => {
      // Create a pipeline sending updating on each chunk read
      stream.pipeline(readStream, progressStream, hashStream, (error) => {
        if (error) {
          delete this.uploadIdToStreamMap[uploadId];
          reject(error);
        } else {
          resolve();
        }
      });
    });

    // Send any remaining progress updates before returning
    throttledOnProgress.flush();

    // Remove streams from in progress mapping
    delete this.uploadIdToStreamMap[uploadId];

    return hashStream.read();
  }

  /**
   * Reads the given file at the 'source'. Each chunk, of 'chunkSize' size
   * read will be sent back in the given 'onProgress' callback. The starting
   * point for the file read may be offset from the first byte using the 'offset'
   * parameter.
   *
   * The file read is tracked by the given 'uploadId' and may be
   * cancelled at any time.
   */
  public async read(
    uploadId: string,
    source: string,
    onProgress: (chunk: Uint8Array) => Promise<void>,
    chunkSize: number,
    offset: number
  ): Promise<void> {
    const readStream = fs.createReadStream(source, {
      // Offset the start byte by the offset param
      start: offset,
      // Control the MAX amount of bytes we read at a time
      // not necessarily guaranteed
      highWaterMark: chunkSize,
    });

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
            const progressUpdates = chunks.map((c) => () => onProgress(c));
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
      progressStream,
    };

    // Wait for stream pipeline to finish
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

    // Remove streams from in progress mapping
    delete this.uploadIdToStreamMap[uploadId];
  }

  /**
   * Cancel any ongoing file read or computation streams
   * tied to the upload emitting the given error if
   * relevant, the default error is a CancellationError.
   */
  public cancel(uploadId: string, error: Error = new CancellationError()) {
    if (uploadId in this.uploadIdToStreamMap) {
      // Detach the read stream from the downstream streams first
      this.uploadIdToStreamMap[uploadId].readStream.unpipe();
      // Destroy the downstream streams emitting an error if possible
      this.uploadIdToStreamMap[uploadId].progressStream?.destroy(error);
      this.uploadIdToStreamMap[uploadId].hashStream?.destroy(error);
      this.uploadIdToStreamMap[uploadId].writeStream?.destroy(error);
      delete this.uploadIdToStreamMap[uploadId];
    }
  }
}

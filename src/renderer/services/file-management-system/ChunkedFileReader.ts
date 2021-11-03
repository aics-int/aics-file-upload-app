import * as crypto from "crypto";
import * as fs from "fs";
import * as stream from "stream";

import { throttle } from "lodash";

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
    const throttledOnProgress = throttle(
      onProgress,
      ChunkedFileReader.THROTTLE_DELAY_IN_MS
    );
    const progressStream = new stream.Transform({
      transform(chunk, _, callback) {
        bytesCopied += chunk.length;
        throttledOnProgress(bytesCopied);
        this.push(chunk);
        callback();
      },
    });

    this.uploadIdToStreamMap[uploadId] = {
      readStream,
      hashStream,
      progressStream,
    };

    await new Promise<void>((resolve, reject) => {
      stream.pipeline(readStream, progressStream, hashStream, (error) => {
        if (error) {
          delete this.uploadIdToStreamMap[uploadId];
          reject(error);
        } else {
          resolve();
        }
      });
    });

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
      start: offset,
      highWaterMark: chunkSize,
    });
    const progressStream = new stream.Transform({
      transform(chunk, _, callback) {
        onProgress(chunk).then(() => {
          this.push(chunk);
          callback();
        });
      },
    });

    this.uploadIdToStreamMap[uploadId] = {
      readStream,
      progressStream,
    };

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

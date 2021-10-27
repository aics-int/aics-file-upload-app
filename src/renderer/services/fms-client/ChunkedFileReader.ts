import * as crypto from "crypto";
import * as fs from "fs";
import * as stream from "stream";

// Create an explicit error class to capture cancellations
export class CancellationError extends Error {
  constructor() {
    super("File copy cancelled by user.");
    this.name = "CancellationError";
  }
}

/**
 * TODO
 */
export default class ChunkedFileReader {
  private readonly uploadIdToStreamMap: {
    [jobId: string]: {
      readStream: fs.ReadStream;
      writeStream?: fs.WriteStream;
      progressStream?: stream.Transform;
      hashStream?: crypto.Hash;
    };
  } = {};

  /**
   * TODO
   */
  public async calculateMD5(uploadId: string, source: string): Promise<string> {
    const readStream = fs.createReadStream(source);
    const hashStream = crypto.createHash("md5").setEncoding("hex");

    this.uploadIdToStreamMap[uploadId] = {
      readStream,
      hashStream,
    };

    await new Promise<void>((resolve, reject) => {
      stream.pipeline(readStream, hashStream, (error) => {
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
   * TODO
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
          delete this.uploadIdToStreamMap[uploadId];
          reject(error);
        } else {
          resolve();
        }
      });
    });

    delete this.uploadIdToStreamMap[uploadId];
  }

  // TODO
  public cancel(uploadId: string) {
    if (uploadId in this.uploadIdToStreamMap) {
      // TODO Why unpipe vs destroy
      this.uploadIdToStreamMap[uploadId].readStream.unpipe();
      const cancelledError = new CancellationError();
      Object.values(this.uploadIdToStreamMap[uploadId]).forEach(
        (fileStream) => {
          fileStream?.destroy(cancelledError);
        }
      );
      delete this.uploadIdToStreamMap[uploadId];
    }
  }
}

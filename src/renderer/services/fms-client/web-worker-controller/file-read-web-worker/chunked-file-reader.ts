import * as fs from "fs";

/**
 * TODO
 */
export default class ChunkedFileReader {
  // File to read in
  private readonly filePath: string;
  // Size of file to read in
  private readonly fileSize: number;
  // Number of bytes to read at a time
  private readonly chunkSize: number;
  // Offset of bytes from first to begin reading from
  private readonly initialOffset: number;

  public constructor(
    filePath: string,
    fileSize: number,
    chunkSize: number,
    initialOffset = 0
  ) {
    this.filePath = filePath;
    this.fileSize = fileSize;
    this.chunkSize = chunkSize;
    this.initialOffset = initialOffset;
  }

  /**
   * TODO
   */
  public async read(
    onChunkRead: (chunk: string, chunkNumber: number) => Promise<void>
  ): Promise<void> {
    // return new Promise<void>((resolve, reject) => {
    //     const fileDescriptor = await fs.promises.open(this.filePath, "r");
    //     try {

    //         // Initialize chunk number & buffer
    //         let chunkNumber = 0;
    //         const readBuffer = Buffer.alloc(this.chunkSize);

    //         // Create recursive strategy for asynchronously reading the file
    //         // in chunks and passing said chunks to the specified callback
    //         const readNextChunk = () => {
    //             // If offset is null read will pick up where it left off
    //             const offset = chunkNumber === 0 ? this.initialOffset : null;
    //         };

    //         // Read first chunk
    //         readNextChunk();
    //     } catch (error) {
    //         fs.promises.close(fileDescriptor)
    //         reject(`Something went wrong reading the file. Details: ${error?.message}`);
    //     }
    // }

    return new Promise<void>((resolve, reject) => {
      fs.open(this.filePath, "r", (openError, fd) => {
        if (openError) {
          reject(`Failed to open file. Details: ${openError?.message}`);
          return;
        }

        // Initialize chunk number & buffer
        let chunkNumber = 0;
        const readBuffer = Buffer.alloc(this.chunkSize);

        // Create recursive strategy for asynchronously reading the file
        // in chunks and passing said chunks to the specified callback
        const readNextChunk = () => {
          // If offset is null read will pick up where it left off
          const offset = chunkNumber === 0 ? this.initialOffset : null;

          // Read file asynchronously
          fs.read(
            fd,
            readBuffer,
            0,
            this.chunkSize,
            offset,
            (readError, bytesRead) => {
              if (readError) {
                fs.close(fd, (closeError) => {
                  let msg = `Failed to close file after failure reading file. Details: ${closeError?.message}.`;
                  if (closeError) {
                    msg += ` Also failed to close file after failure`; // Bummer :/
                  }
                  reject(msg);
                });
              } else if (bytesRead) {
                // Increment chunks read tracker
                chunkNumber += 1;

                // Extract bytes from buffer
                const data = readBuffer.slice(0, bytesRead);

                // Wait for chunk to be received by main thread
                onChunkRead(data.toString(), chunkNumber).then(() => {
                  const totalBytesRead =
                    this.initialOffset + chunkNumber * this.chunkSize;

                  // Base Case: If totalBytesRead is greater than file size, file read is complete
                  if (totalBytesRead >= this.fileSize) {
                    resolve();
                    return;
                  }

                  // Recurse: Read another chunk
                  readNextChunk();
                });
              }
            }
          );
        };

        // Read first chunk
        readNextChunk();
      });
    });
  }
}

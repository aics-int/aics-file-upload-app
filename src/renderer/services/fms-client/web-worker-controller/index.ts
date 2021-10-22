import FileReadWorker from "worker-loader!./file-read-web-worker";

import { FileReadWebWorkerConfig } from "./file-read-web-worker";

// TODO: Explore WorkerThreads TBD if either help??? Need to prevent blocking main thread :/

/**
 * TODO
 */
export default class WebWorkerController {
  private static readonly DEFAULT_CHUNK_SIZE = 1024; // Arbitrary
  private jobIdToWebWorkerMap: { [jobId: string]: Worker } = {};

  /**
   * Asynchronously read the given file in chunks through a web worker. Reports each
   * chunk read through the callback given awaiting the response from the callback.
   */
  public readFile(
    file: File,
    jobId: string,
    onChunkRead: (chunk: string, chunkNumber: number) => Promise<void>,
    chunkSize: number = WebWorkerController.DEFAULT_CHUNK_SIZE,
    initialOffset = 0
  ): Promise<void> {
    // Create web worker to perform read, this allows
    // multiple reads to run in background threads
    const worker = this.createWorker(jobId);

    return new Promise<void>((resolve, reject) => {
      // Callback for completing the upload (successful or not)
      const onError = (error: string) => {
        this.cancel(jobId);
        reject(error);
      };

      const onComplete = () => {
        this.cancel(jobId);
        resolve();
      };

      // Catch any unexpected errors
      worker.onerror = (e: ErrorEvent) => {
        onError(e.message || "Unknown error sent");
      };

      // Begin upload in worker
      worker.postMessage({
        chunkSize,
        file,
        initialOffset,
        onComplete,
        onProgress: onChunkRead,
        onError,
      } as FileReadWebWorkerConfig);
    });
  }

  /**
   * TODO
   */
  public cancel(jobId: string): void {
    if (jobId in this.jobIdToWebWorkerMap) {
      this.jobIdToWebWorkerMap[jobId].terminate();
      delete this.jobIdToWebWorkerMap[jobId];
    }
  }

  /**
   * TODO
   */
  private createWorker(jobId: string): Worker {
    this.cancel(jobId);
    return new FileReadWorker();
  }
}

import Logger from "js-logger";
import { ILogger } from "js-logger/src/types";

import { JobStatusClient, MMSClient } from "..";
import FileStorageClient2 from "../fss2-client";

interface UploadClientConfig {
    fss: FileStorageClient2;
    jss: JobStatusClient;
    mms: MMSClient;
}

export default class UploadClient {
    private readonly fss: FileStorageClient2;
    private readonly jss: JobStatusClient;
    private readonly mms: MMSClient;
    private readonly logger: ILogger = Logger.get("upload-client");

    public constructor(config: UploadClientConfig) {
      this.fss = config.fss;
      this.jss = config.jss;
      this.mms = config.mms;
    }

    public async startUpload(filePath: string, metadata: {}) {
        const file = new File(filePath);
        this.logger.debug(`Starting upload for ${file.name} with metadata ${JSON.stringify(metadata)}`);

        // Perist job in JSS to store metadata elsewhere in
        // the event of a failure
        const { jobId } = await this.jss.createJob({});

        try {
            // Calculate MD5 ahead of submission
            const md5 = await this.calculateMD5(filePath);
    
            // Start job in FSS
            const registration = await this.fss.registerUpload(file.name, file.size, md5)
    
            // Update parent job with upload job created by FSS
            await this.jss.updateJob(jobId, {});
            
            // Wait for upload
            this.logger.debug(`Beginning chunked upload to FSS for ${file.name}`);
            await this.uploadInChunks(file, registration.uploadId, registration.chunkSize);

            // Add metadata to file via MMS
            await this.mms.createMetadata(metadata);
        } catch (error) {
            // Fail job in JSS with error
            const errMsg = `Something went wrong uploading ${file.name}. Details: ${error?.message}`
            this.logger.error(errMsg);
            await this.jss.updateJob(jobId, {});
        } finally {
            this.logger.timeEnd(file.name);
        }
    }

    public async resume() {
        // If job ongoing in FSS
        //     continue sending chunks
        // If complete in fss
        //     add metadata
        // otherwise
        // return
    }

    public async retry() {
        // If job ongoing in FSS
        //     resume()
        // Otherwise if job complete in FSS
        //     Add metadata
        // Otherwise
        // update job to cancelled or delete it & upload()
    }

    public async cancel() {
        // If just needs metadata, throw error, shouldn't be option
        // Otherwise job ongoing in FSS
        // cancel in FSS
        // update job to cancelled
    }

    private uploadInChunks(file: File, uploadId: string, chunkSize: number): Promise<void> {
        // Create web worker to perform upload, this allows
        // multiple uploads to run in background threads
        const worker = Worker();
    
        return new Promise<void>((resolve, reject) => {
            // Callback for submitting the chunk to FSS
            const onProgress = async (chunk: string | ArrayBuffer, chunkNumber: number) => {
                this.fss.sendUploadChunk(uploadId, chunkNumber, chunk);
            }

            // Callback for completing the upload (successful or not)
            const onComplete = (error?: string) => {
                if (error) {
                    reject(new Error(error));
                } else {
                    resolve();
                }
            }

            // Catch any unexpected errors
            worker.onerror = (e: ErrorEvent) => {
                worker.destroy() // TODO: ???
                onComplete(e.message || "Unknown error sent");
            };

            // Begin upload in worker
            worker.postMessage([
                file,
                0,
                chunkSize,
                onProgress,
                onComplete
            ]);
        })
    }

    private async calculateMD5(filePath: string): Promise<string> {
        return "";
    }

    private async isUploadComplete(): boolean {

    }
}

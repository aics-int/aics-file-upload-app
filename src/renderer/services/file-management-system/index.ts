import * as fs from "fs";
import * as path from "path";

import Logger from "js-logger";
import { ILogger } from "js-logger/src/types";
import { throttle, uniq } from "lodash";
import * as uuid from "uuid";

import { JobStatusService, LabkeyClient, MetadataManagementService } from "..";
import { metadata } from "../../state";
import FileStorageService, {
  ChunkStatus,
  UploadStatus,
  UploadStatusResponse,
} from "../file-storage-service";
import {
  IN_PROGRESS_STATUSES,
  UploadJob,
  JSSJobStatus,
  UploadServiceFields,
} from "../job-status-service/types";
import { UploadRequest } from "../types";

import ChunkedFileReader, { CancellationError } from "./ChunkedFileReader";

interface FileManagementClientConfig {
  fileReader: ChunkedFileReader;
  fss: FileStorageService;
  jss: JobStatusService;
  lk: LabkeyClient;
  mms: MetadataManagementService;
}

export interface UploadProgressInfo {
  // Step 1 of upload
  md5BytesComputed?: number;

  // Step 2 of upload
  bytesUploaded?: number;

  totalBytes: number;
}

/**
 * Service entity for storing or retrieving files from the AICS FMS. This
 * class is responsible for abstracting the work needed to upload a file into
 * the FMS.
 */
export default class FileManagementSystem {
  private readonly fileReader: ChunkedFileReader;
  private readonly fss: FileStorageService;
  private readonly jss: JobStatusService;
  private readonly lk: LabkeyClient;
  private readonly mms: MetadataManagementService;
  private readonly logger: ILogger;

  // Creates JSS friendly unique ids
  public static createUniqueId() {
    return uuid.v1().replace(/-/g, "");
  }

  public constructor(
    config: FileManagementClientConfig,
    logger: ILogger = Logger.get("fms")
  ) {
    this.fileReader = config.fileReader;
    this.fss = config.fss;
    this.jss = config.jss;
    this.lk = config.lk;
    this.mms = config.mms;
    this.logger = logger;
  }

  /**
   * Initiates the upload by creating a tracker job
   * in JSS with the metadata to enable retry functionality
   */
  public initiateUpload(
    metadata: UploadRequest,
    user: string,
    serviceFields: Partial<UploadServiceFields> = {}
  ): Promise<UploadJob> {
    return this.jss.createJob({
      jobName: path.basename(metadata.file.originalPath),
      service: "file-upload-app",
      status: JSSJobStatus.WAITING,
      user,
      serviceFields: {
        files: [metadata],
        type: "upload",
        ...serviceFields,
      },
    });
  }

  /**
   * Uploads the file at the given path and metadata.
   * Sends upload in chunks reporting the total bytes
   * read on each chunk submission.
   */
  public async upload(
    upload: UploadJob,
    onProgress: (progress: UploadProgressInfo) => void
  ): Promise<void> {
    this.logger.time(upload.jobName || "");
    try {
      // Grab file details
      const source = upload.serviceFields.files[0]?.file.originalPath;
      const fileName = path.basename(source);
      const {
        size: fileSize,
        mtime: fileLastModified,
      } = await fs.promises.stat(source);
      const fileLastModifiedInMs = fileLastModified.getMilliseconds();

      this.logger.debug(
        `Starting upload for ${fileName} with metadata ${JSON.stringify(
          metadata
        )}`
      );

      // Calculate MD5 ahead of submission, re-use from job if possible. Only potentially available
      // on job if this upload is being re-submitted like for a retry. Avoid reusing MD5 if the file
      // has been modified since the MD5 was calculated
      let md5;
      if (
        upload.serviceFields.calculatedMD5 &&
        fileLastModifiedInMs === upload.serviceFields.lastModifiedInMS
      ) {
        md5 = upload.serviceFields.calculatedMD5;
      } else {
        md5 = await this.fileReader.calculateMD5(
          upload.jobId,
          upload.serviceFields.files[0]?.file.originalPath,
          (md5BytesComputed) =>
            onProgress({ md5BytesComputed, totalBytes: fileSize })
        );
      }

      // Prevent attempting to upload a duplicate
      if (await this.lk.fileExistsByNameAndMD5(fileName, md5)) {
        throw new Error(
          `File ${fileName} with MD5 ${md5} already exists in LabKey`
        );
      }

      // Start job in FSS
      const registration = await this.fss.registerUpload(
        fileName,
        fileSize,
        md5
      );

      // Update parent job with upload job created by FSS
      // for tracking in the event of a retry
      await this.jss.updateJob(upload.jobId, {
        serviceFields: {
          calculatedMD5: md5,
          fssUploadChunkSize: registration.chunkSize,
          fssUploadId: registration.uploadId,
          lastModifiedInMS: fileLastModifiedInMs,
        },
      });

      // Wait for upload
      this.logger.debug(`Beginning chunked upload to FSS for ${fileName}`);
      await this.uploadInChunks(
        registration.uploadId,
        source,
        registration.chunkSize,
        (bytesUploaded) => onProgress({ bytesUploaded, totalBytes: fileSize })
      );

      // Add metadata and complete tracker job
      await this.finalizeUpload(upload, registration.uploadId);
    } catch (error) {
      // Ignore cancellation errors
      if (!(error instanceof CancellationError)) {
        // Fail job in JSS with error
        const errMsg = `Something went wrong uploading ${upload.jobName}. Details: ${error?.message}`;
        this.logger.error(errMsg);
        await this.jss.updateJob(upload.jobId, {
          status: JSSJobStatus.FAILED,
          serviceFields: { error: errMsg },
        });
        throw error;
      }
    } finally {
      this.logger.timeEnd(upload.jobName || "");
    }
  }

  /**
   * Attempts to retry the upload for the given failed job. The job will not
   * be reused, but will instead be replaced.
   *
   * Will attempt to first resume an ongoing upload before retrying it completely.
   *
   * Backwards compatible with uploads that have a many to many relationship
   * with files in which case this will split the uploads into many different uploads.
   */
  public async retry(
    uploadId: string,
    onProgress: (uploadId: string, progress: UploadProgressInfo) => void
  ): Promise<void> {
    console.info(`Retrying upload for jobId=${uploadId}.`);

    // Request job from JSS & validate if it is retryable
    const upload = await this.jss.getJob(uploadId);

    // Avoid attempting to retry a successful job, should be an update in that case
    if (upload.status === JSSJobStatus.SUCCEEDED) {
      throw new Error(
        `Upload cannot be retried if already successful, actual status is ${upload.status}.`
      );
    }

    // Attempt to resume an ongoing upload if possible before scraping this one entirely
    if (upload.serviceFields.fssUploadId) {
      try {
        const fssStatus = await this.fss.getStatus(
          upload.serviceFields.fssUploadId
        );
        if (
          fssStatus.uploadStatus === UploadStatus.WORKING ||
          fssStatus.uploadStatus === UploadStatus.COMPLETE
        ) {
          const { size: fileSize } = await fs.promises.stat(
            upload.serviceFields.files?.[0]?.file.originalPath
          );
          return await this.resume(upload, fssStatus, (bytesUploaded) =>
            onProgress(uploadId, { bytesUploaded, totalBytes: fileSize })
          );
        }
      } catch (error) {
        // No-op: This check is just an attempt to resume, still able to recover from here
      }
    }

    // Start new upload jobs that will replace the current one
    const newJobServiceFields = {
      groupId:
        upload.serviceFields?.groupId || FileManagementSystem.createUniqueId(),
      originalJobId: uploadId,
    };

    // Create a separate upload for each file in this job
    // One job for multiple files is deprecated, this is here
    // for backwards-compatibility
    const results = await Promise.all(
      (upload.serviceFields?.files || []).map(async (metadata) => {
        try {
          // Get a fresh upload job to track the upload with
          const newUpload = await this.initiateUpload(
            metadata,
            upload.user,
            newJobServiceFields
          );

          try {
            // Update the current job with information about the replacement
            await this.jss.updateJob(uploadId, {
              status: JSSJobStatus.FAILED,
              serviceFields: {
                error: `This job has been replaced with Job ID: ${newUpload.jobId}`,
                replacementJobIds: uniq([
                  ...(upload?.serviceFields?.replacementJobIds || []),
                  newUpload.jobId,
                ]),
              },
            });
          } catch (error) {
            // Cancel the new job if unable to update the old one
            await this.cancel(newUpload.jobId);
            throw error;
          }

          // Perform upload with new job and current job's metadata, forgoing the current job
          return await this.upload(newUpload, (progress) =>
            onProgress(newUpload.jobId, progress)
          );
        } catch (error) {
          // Catch exceptions to allow other jobs to run before re-throwing the error
          return { error };
        }
      })
    );

    // Evaluate the results throwing the first error seen (if any)
    results.forEach((result) => {
      const errorCase = result as { error: Error };
      if (errorCase.error) {
        throw errorCase.error;
      }
    });
  }

  /**
   * Attempts to cancel the ongoing upload. Unable to cancel uploads
   * in progress or that have been copied into FMS.
   */
  public async cancel(uploadId: string): Promise<void> {
    const { status, ...job } = await this.jss.getJob(uploadId);

    // Job must be in progress in order to cancel
    if (!IN_PROGRESS_STATUSES.includes(status)) {
      throw new Error(
        `Upload ${uploadId} cannot be canceled while not in progress, actual status is ${status}`
      );
    }

    // Cancel any web worker currently active just in case
    this.fileReader.cancel(uploadId);

    // If we haven't saved the FSS Job ID this either failed miserably or hasn't progressed much
    if (job.serviceFields?.fssUploadId) {
      const { uploadStatus } = await this.fss.getStatus(
        job.serviceFields?.fssUploadId
      );

      // If FSS has completed the upload it is too late to cancel
      if (uploadStatus === UploadStatus.COMPLETE) {
        throw new Error(`Upload has progressed too far to be canceled`);
      }

      // Cancel upload in FSS
      await this.fss.cancelUpload(job.serviceFields.fssUploadId);
    }

    // Update the job to provide feedback
    await this.jss.updateJob(uploadId, {
      status: JSSJobStatus.FAILED,
      serviceFields: { cancelled: true, error: "Cancelled by user" },
    });
  }

  /**
   * Attempts to resume the given "in progress" upload. This is *not* meant to be
   * used in regular upload circumstances, but rather should be used
   * when an upload was stopped while it was ongoing due to an event
   * like an app crash.
   *
   * This will try to take advantage of any work
   * already done to upload the file.
   */
  private async resume(
    upload: UploadJob,
    fssStatus: UploadStatusResponse,
    onProgress: (bytesUploaded: number) => void
  ): Promise<void> {
    // Update status in case resume process goes smoothly
    await this.jss.updateJob(upload.jobId, {
      status: JSSJobStatus.RETRYING,
    });

    try {
      const { fssUploadId } = upload.serviceFields;
      // Shouldn't occur, but kept for type safety
      if (!fssUploadId) {
        throw new Error(
          "Upload missing vital information about upload ID to send to server"
        );
      }

      if (fssStatus.uploadStatus === UploadStatus.COMPLETE) {
        // TODO: CHeck if it needs to be repeated?
        // TODO: When should we do then vs retry?
        // if (needs to be repeated?) {
        // await this.fss.repeatFinalize(upload.serviceFields.fssUploadId);
        // }
      } else if (fssStatus.uploadStatus === UploadStatus.WORKING) {
        // TODO: This field should soon come from the getStatus endpoint of FSS
        // Shouldn't occur, but kept for type safety
        if (!upload.serviceFields.fssUploadChunkSize) {
          throw new Error(
            "Upload missing vital information about chunk size to send to server"
          );
        }

        // If FSS is still available to continue receiving chunks of this upload
        // simply continue sending the chunks
        const lastChunkNumber = fssStatus.chunkStatuses.findIndex(
          (status) => status !== ChunkStatus.COMPLETE
        );
        await this.uploadInChunks(
          upload.jobId,
          upload.serviceFields.files[0]?.file.originalPath,
          upload.serviceFields.fssUploadChunkSize,
          onProgress,
          lastChunkNumber
        );
      } else {
        // Shouldn't occur, but just in case
        throw new Error("Unable to resume a failed upload");
      }

      // Add metadata and complete tracker job
      await this.finalizeUpload(upload, fssUploadId);
    } catch (error) {
      // Fail job in JSS with error
      const errMsg = `Something went wrong resuming ${upload.jobName}. Details: ${error?.message}`;
      this.logger.error(errMsg);
      await this.jss.updateJob(upload.jobId, {
        status: JSSJobStatus.FAILED,
        serviceFields: { error: errMsg },
      });
      throw error;
    }
  }

  /**
   * Uploads the given file to FSS in chunks asynchronously using a NodeJS.
   */
  private async uploadInChunks(
    uploadId: string,
    source: string,
    chunkSize: number,
    onProgress: (bytesUploaded: number) => void,
    initialChunkNumber = 0
  ): Promise<void> {
    let chunkNumber = initialChunkNumber;

    // Throttle the progress callback to avoid sending
    // too many updates on fast uploads
    const throttledOnProgress = throttle(
      onProgress,
      ChunkedFileReader.THROTTLE_DELAY_IN_MS
    );

    // Prepare a callback to send each chunk to FSS on each file
    // chunk read and send the progress to the onProgress callback
    let bytesUploaded = 0;
    const onChunkRead = async (chunk: Uint8Array): Promise<void> => {
      chunkNumber += 1;
      await this.fss.sendUploadChunk(
        uploadId,
        chunkSize,
        chunkNumber,
        bytesUploaded,
        chunk
      );
      bytesUploaded += chunk.byteLength;
      throttledOnProgress(bytesUploaded);
    };

    // Read in file
    await this.fileReader.read(
      uploadId,
      source,
      onChunkRead,
      chunkSize,
      chunkSize * initialChunkNumber
    );

    // Ensure final progress events are sent
    throttledOnProgress.flush();
  }

  /**
   * Finishes the remaining work to finalize the upload after
   * FSS's portion has been completed
   */
  private async finalizeUpload(
    upload: UploadJob,
    fssUploadId: string
  ): Promise<void> {
    // TODO: Remove this
    throw new Error("Not yet implemented finalize step");

    // TODO: Wait for file to exist by polling... something?
    // TODO: remove this though
    const finalizeResponse = await this.fss.repeatFinalize(fssUploadId);
    const fileId = finalizeResponse.fileId as string;

    // Add metadata to file via MMS
    await this.mms.createFileMetadata(fileId, upload.serviceFields.files[0]);

    // Complete tracker job and add the local file path to it for ease of viewing
    const { localPath } = await this.fss.getFileAttributes(fileId);
    await this.jss.updateJob(upload.jobId, {
      status: JSSJobStatus.SUCCEEDED,
      serviceFields: {
        result: [
          {
            fileId,
            fileName: path.basename(localPath),
            readPath: localPath,
          },
        ],
      },
    });
  }
}

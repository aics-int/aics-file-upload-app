import * as fs from "fs";
import * as path from "path";

import Logger from "js-logger";
import { ILogger } from "js-logger/src/types";
import { uniq } from "lodash";
import * as uuid from "uuid";

import { JobStatusClient, LabkeyClient, MMSClient } from "..";
import { metadata } from "../../state";
import FileStorageClient, {
  ChunkStatus,
  UploadStatus,
  UploadStatusResponse,
} from "../fss-client";
import {
  IN_PROGRESS_STATUSES,
  JSSJob,
  JSSJobStatus,
  ServiceFields,
} from "../job-status-client/types";
import { UploadRequest } from "../types";

import ChunkedFileReader, { CancellationError } from "./ChunkedFileReader";

interface FileManagementSystemConfig {
  fss: FileStorageClient;
  jss: JobStatusClient;
  lk: LabkeyClient;
  mms: MMSClient;
}

/**
 * TODO
 */
export default class FileManagementSystem {
  private readonly fss: FileStorageClient;
  private readonly jss: JobStatusClient;
  private readonly lk: LabkeyClient;
  private readonly mms: MMSClient;
  private readonly fileReader = new ChunkedFileReader();
  private readonly logger: ILogger = Logger.get("upload-client");

  // Creates JSS friendly unique ids
  public static createUniqueId() {
    return uuid.v1().replace(/-/g, "");
  }

  public constructor(config: FileManagementSystemConfig) {
    this.fss = config.fss;
    this.jss = config.jss;
    this.lk = config.lk;
    this.mms = config.mms;
  }

  /**
   * TODO
   */
  public initiateUpload(
    metadata: UploadRequest,
    user: string,
    serviceFields: Partial<ServiceFields> = {}
  ): Promise<JSSJob> {
    return this.jss.createJob({
      jobName: metadata.file.fileName,
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
   *
   * Utilizes Web Workers to take advantage of I/O wait time & avoid
   * blocking the main thread (UI).
   */
  public async upload(upload: JSSJob): Promise<void> {
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
      // on job if this upload is being re-submitted like for a retry
      let md5;
      if (
        upload.serviceFields.calculatedMD5 &&
        fileLastModifiedInMs === upload.serviceFields.lastModifiedInMS
      ) {
        md5 = upload.serviceFields.calculatedMD5;
      } else {
        md5 = await this.fileReader.calculateMD5(
          upload.jobId,
          upload.serviceFields.files[0]?.file.originalPath
        );
      }

      // Prevent attempting to upload a duplicate
      if (await this.lk.fileExistsByNameAndMD5(fileName, md5)) {
        throw new Error(
          `File ${fileName} with MD5 ${md5} already exists in LabKey`
        );
      }

      // Start job in FSS
      // TODO: Would be useful if this returned future file path & file id
      const registration = await this.fss.registerUpload(
        fileName,
        fileSize,
        md5
      );

      // Update parent job with upload job created by FSS
      await this.jss.updateJob(upload.jobId, {
        serviceFields: {
          fssUploadId: registration.uploadId,
          calculatedMD5: md5,
        },
      });

      // Wait for upload
      this.logger.debug(`Beginning chunked upload to FSS for ${fileName}`);
      const fileId = await this.uploadInChunks(
        registration.uploadId,
        source,
        registration.chunkSize
      );

      // Add metadata and complete tracker job
      await this.finalizeUpload(upload, fileId);
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
  public async retry(uploadId: string): Promise<void> {
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
          await this.resume(upload, fssStatus);
          return;
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
            const oldJobPatch = {
              serviceFields: {
                error: `This job has been replaced with Job ID: ${newUpload.jobId}`,
                replacementJobIds: uniq([
                  ...(upload?.serviceFields?.replacementJobIds || []),
                  newUpload.jobId,
                ]),
              },
            };
            // TODO: Should this be a patch update?
            await this.jss.updateJob(uploadId, oldJobPatch, false);

            // Perform upload with new job and current job's metadata, forgoing the current job
            return this.upload(newUpload);
          } catch (error) {
            // Catch exceptions and fail the job if something happened before the upload could start
            await this.failJob(
              newUpload.jobId,
              `Something went wrong retrying ${newUpload.jobName}. Details: ${error?.message}`
            );
            throw error;
          }
        } catch (error) {
          // Catch exceptions to allow other jobs to run before re-throwing the error
          return { error };
        }
      })
    );

    // This ensures each upload promise is able to complete before
    // evaluating any failures (similar to Promise.allSettled)
    await Promise.all(
      results.map(async (result) => {
        const errorCase = result as { error: Error };
        if (errorCase?.error) {
          // Update the original upload to track the failure in the
          // event the new upload has not been created yet
          const errMsg = `Something went wrong uploading ${uploadId}. Details: ${errorCase.error?.message}`;
          this.logger.error(errMsg);
          await this.jss.updateJob(uploadId, {
            status: JSSJobStatus.FAILED,
            serviceFields: { error: errMsg },
          });
          throw errorCase.error;
        }
      })
    );
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

    // If we haven't saved the FSS Job ID this either failed miserably or hasn't progressed much
    if (job.serviceFields?.fssUploadId) {
      // TODO: Need to actually store fssUploadId somewhere
      const { uploadStatus } = await this.fss.getStatus(
        job.serviceFields?.fssUploadId
      );

      // If FSS has completed the upload it is too late to cancel
      if (uploadStatus === UploadStatus.COMPLETE) {
        throw new Error(`Upload has progressed too far to be canceled`);
      }
    }

    // Cancel any web worker currently active just in case
    this.fileReader.cancel(uploadId);

    // Cancel upload in FSS
    await this.fss.cancelUpload(uploadId);

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
    upload: JSSJob,
    fssStatus: UploadStatusResponse
  ): Promise<void> {
    // Update status in case resume process goes smoothly
    await this.jss.updateJob(upload.jobId, {
      status: JSSJobStatus.RETRYING,
    });

    try {
      let fileId;
      if (fssStatus.uploadStatus === UploadStatus.COMPLETE) {
        // Shouldn't occur, but kept for type safety
        if (!upload.serviceFields.fssUploadId) {
          throw new Error(
            "Upload missing vital information about upload ID to send to server"
          );
        }

        // Check to see if FSS completed the upload, but has yet to create the database record in LK
        console.log("getting attributes", fssStatus, upload.serviceFields);
        const file = await this.fss.getFileAttributes(
          upload.serviceFields.fssUploadId
        );
        if (!file.addedToLabkey) {
          await this.fss.repeatFinalize(upload.serviceFields.fssUploadId);
        }

        fileId = file.fileId;
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
        fileId = await this.uploadInChunks(
          upload.jobId,
          upload.serviceFields.files[0]?.file.originalPath,
          upload.serviceFields.fssUploadChunkSize,
          lastChunkNumber
        );
      } else {
        // Shouldn't occur, but just in case
        throw new Error("Unable to resume a failed upload");
      }

      // Add metadata and complete tracker job
      await this.finalizeUpload(upload, fileId);
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
   * Uploads the given file to FSS in chunks using a WebWorker.
   */
  private async uploadInChunks(
    uploadId: string,
    source: string,
    chunkSize: number,
    initialChunkNumber = 0
  ): Promise<string> {
    let chunkNumber = initialChunkNumber;
    let fileId: string | undefined = undefined;
    const onChunkRead = async (chunk: Uint8Array): Promise<void> => {
      chunkNumber += 1;
      const response = await this.fss.sendUploadChunk(
        uploadId,
        chunkSize,
        chunkNumber,
        chunk
      );
      // On the last chunk sent the File Id should be returned from FSS
      fileId = response.fileId;
    };
    await this.fileReader.read(
      uploadId,
      source,
      onChunkRead,
      chunkSize,
      chunkSize * initialChunkNumber
    );
    if (!fileId) {
      throw new Error("File ID is was never ascertained from chunked uploads");
    }
    return fileId;
  }

  /**
   * Finishes the remaining work to finalize the upload after
   * FSS's portion has been completed
   */
  private async finalizeUpload(upload: JSSJob, fileId: string): Promise<void> {
    // Add metadata to file via MMS
    await this.mms.createFileMetadata(fileId, upload.serviceFields.files[0]);

    // Complete tracker job and add the local file path to it for ease of viewing
    console.log("getting attributes at end");
    const { localPath } = await this.fss.getFileAttributes(fileId);
    await this.jss.updateJob(upload.jobId, {
      status: JSSJobStatus.SUCCEEDED,
      serviceFields: {
        fmsFilePath: localPath,
      },
    });
  }

  private async failJob(jobId: string, error: string): Promise<void> {
    await this.jss.updateJob(jobId, {
      status: JSSJobStatus.FAILED,
      serviceFields: { error },
    });
  }
}

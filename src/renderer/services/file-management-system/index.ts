import * as fs from "fs";
import * as path from "path";

import { throttle, uniq } from "lodash";
import * as uuid from "uuid";

import { extensionToFileTypeMap, FileType } from "../../util";
import FileStorageService, {
  UploadStatus,
  UploadStatusResponse,
} from "../file-storage-service";
import JobStatusService from "../job-status-service";
import {
  IN_PROGRESS_STATUSES,
  UploadJob,
  JSSJobStatus,
  UploadServiceFields,
  Service,
} from "../job-status-service/types";
import MetadataManagementService from "../metadata-management-service";
import { UploadRequest } from "../types";

import ChunkedFileReader, { CancellationError } from "./ChunkedFileReader";
import Md5Hasher from "./Md5Hasher";

interface FileManagementClientConfig {
  fileReader: ChunkedFileReader;
  fss: FileStorageService;
  jss: JobStatusService;
  mms: MetadataManagementService;
}

export interface UploadProgressInfo {
  md5BytesComputed?: number;
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
  private readonly mms: MetadataManagementService;

  private static readonly CHUNKS_CEILING_INFLIGHT_REQUEST_CEILING = 20; //ceiling on concurrent chunk requests (even if more can fit in memory)

  /**
   * Returns JSS friendly UUID to group files
   * uploaded together
   */
  public static createUploadGroupId() {
    return uuid.v1().replace(/-/g, "");
  }

  private static sleep(timeoutInMs = 2000) {
    return new Promise(resolve => setTimeout(resolve, timeoutInMs))
  }

  public constructor(config: FileManagementClientConfig) {
    this.fileReader = config.fileReader;
    this.fss = config.fss;
    this.jss = config.jss;
    this.mms = config.mms;
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
      service: Service.FILE_UPLOAD_APP,
      status: JSSJobStatus.WAITING,
      user,
      serviceFields: {
        files: [metadata],
        type: "upload",
        localNasShortcut: true, //TODO accept from ui control chrishu 4/21/23
        ...serviceFields,
      },

    });
  }

  private async register(
    upload: UploadJob,
  ): Promise<[UploadStatusResponse, string, number]> {
    // Grab file details
    const source = upload.serviceFields.files[0]?.file.originalPath;
    const fileName = path.basename(source);
    const { size: fileSize, mtime: fileLastModified } = await fs.promises.stat(source);
    const fileLastModifiedInMs = fileLastModified.getTime();
    // Heuristic which in most cases, prevents attempting to upload a duplicate
    if (await this.fss.fileExistsByNameAndSize(fileName, fileSize)) {
      throw new Error(
        `File ${fileName} with size ${fileSize} already exists in FMS`
      );
    }

    // Start job in FSS
    const fileType = extensionToFileTypeMap[
      path.extname(upload.serviceFields.files[0]?.file.originalPath).toLowerCase()
    ] || FileType.OTHER;

    const registration = await this.fss.registerUpload(
      fileName,
      fileType,
      fileSize,
      upload.serviceFields.localNasShortcut ? source : undefined,
    );

    // Update parent job with upload job created by FSS
    // for tracking in the event of a retry
    await this.jss.updateJob(upload.jobId, {
      serviceFields: {
        fssUploadId: registration.uploadId,
        lastModifiedInMS: fileLastModifiedInMs,
      },
    });
    return [registration, source, fileSize];
  }
  /**
   * Uploads the file at the given path and metadata.
   * Sends upload in chunks reporting the total bytes
   * read on each chunk submission.
   * Does not complete the upload, FSS must do some work asynchronously
   * before we can do so. This app will track the FSS upload job to
   * determine when it is time to complete the upload.
   */
  public async upload(
    upload: UploadJob,
    onProgress: (progress: UploadProgressInfo) => void
  ): Promise<void> {
    try {
      const [fssStatus, source, fileSize] = await this.register(upload);
      if (upload.serviceFields.localNasShortcut) {
        this.updateProgress(fssStatus.uploadId, fileSize, onProgress);
      } else {
        await this.uploadInChunks({
          fssStatus,
          source,
          user: upload.user,
          onProgress: (bytesUploaded) => onProgress({ bytesUploaded, totalBytes: fileSize })
        });
      }

    } catch (error) {
      // Ignore cancellation errors
      if (!(error instanceof CancellationError)) {
        // Fail job in JSS with error
        const errMsg = `Something went wrong uploading ${upload.jobName}. Details: ${error?.message}`;
        console.error(errMsg);
        await this.failUpload(upload.jobId, errMsg);
        throw error;
      }
    }
  }

  /**
   * Finishes the remaining work to finalize the upload after
   * FSS's portion has been completed asynchronously
   */
  public async complete(upload: UploadJob, fileId: string): Promise<void> {
    try {
      // Add metadata to file via MMS
      const metadata = upload.serviceFields.files[0];
      const metadataWithUploadId = {
        ...metadata,
        customMetadata: metadata.customMetadata ? {
          templateId: metadata.customMetadata.templateId,
          annotations: metadata.customMetadata.annotations.filter(annotation => (
            annotation.values.length > 0
          )),
        } : undefined,
        file: {
          ...metadata.file,
          jobId: upload.jobId,
        },
      };
      await this.mms.createFileMetadata(fileId, metadataWithUploadId);

      // Complete tracker job and add the local file path to it for ease of viewing
      const { localPath } = await this.fss.getFileAttributes(fileId);
      await this.jss.updateJob(
        upload.jobId,
        {
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
        },
        false
      );
    } catch (error) {
      await this.failUpload(
        upload.jobId,
        `Something went wrong trying to complete this app's portion of the upload. Details: ${error?.message}`
      );
      throw error;
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
    // Request job from JSS & validate if it is retryable
    const fuaUpload = (await this.jss.getJob(uploadId)) as UploadJob;

    // Avoid attempting to retry a successful job, should be an update in that case
    if (fuaUpload.status === JSSJobStatus.SUCCEEDED) {
      throw new Error(
        `Upload cannot be retried if already successful, actual status is ${fuaUpload.status}.`
      );
    }

    // Attempt to resume an ongoing upload if possible before scraping this one entirely
    const { fssUploadId } = fuaUpload.serviceFields;
    let resumeError: Error | undefined;

    if (fssUploadId) {
      const fssStatus = await this.fss.getStatus(fssUploadId);
      if (fssStatus?.status !== UploadStatus.INACTIVE) {
        try {
          await this.resume(fuaUpload, fssStatus, onProgress);
          return;
        } catch (error) {
          // Cancel FSS upload to retry again from scratch
          resumeError = error
          await this.fss.cancelUpload(fssStatus.uploadId);
        }
      }
    }

    // Start new upload jobs that will replace the current one
    const newJobServiceFields = {
      groupId:
        fuaUpload.serviceFields?.groupId ||
        FileManagementSystem.createUploadGroupId(),
      originalJobId: uploadId,
      localNasShortcut: fuaUpload.serviceFields?.localNasShortcut
    };

    // Create a separate upload for each file in this job
    // One job for multiple files is deprecated, this is here
    // for backwards-compatibility
    const results = await Promise.all(
      (fuaUpload.serviceFields?.files || []).map(async (metadata) => {
        try {
          // Get a fresh upload job to track the upload with
          const newUpload = await this.initiateUpload(
            metadata,
            fuaUpload.user,
            newJobServiceFields
          );

          try {
            // Update the current job with information about the replacement
            let errorMessage = `This job has been replaced with Job ID: ${newUpload.jobId}`
            if (resumeError) {
              errorMessage += ` after attempting to resume resulting in error ${resumeError?.message}`
            }
            await this.jss.updateJob(
              uploadId,
              {
                status: JSSJobStatus.FAILED,
                serviceFields: {
                  error: errorMessage,
                  replacementJobIds: uniq([
                    ...(fuaUpload?.serviceFields?.replacementJobIds || []),
                    newUpload.jobId,
                  ]),
                },
              },
              false
            );
          } catch (error) {
            // Cancel the new job if unable to update the old one
            await this.cancel(newUpload.jobId);
            throw error;
          }

          // Perform upload with new job and current job's metadata, forgoing the current job
          await this.upload(newUpload, (progress) =>
            onProgress(newUpload.jobId, progress)
          );
          return;
        } catch (error) {
          // Catch exceptions to allow other jobs to run before re-throwing the error
          return { error };
        }
      })
    );

    // Evaluate the results throwing the first error seen (if any)
    results.forEach((result) => {
      const errorCase = result as { error?: Error };
      if (errorCase?.error) {
        throw errorCase.error;
      }
    });
  }

  /**
   * Attempts to cancel the ongoing upload. Unable to cancel uploads
   * in progress or that have been copied into FMS.
   */
  public async cancel(uploadId: string): Promise<void> {
    const { status, ...upload } = (await this.jss.getJob(
      uploadId
    )) as UploadJob;

    // Job must be in progress in order to cancel
    if (!IN_PROGRESS_STATUSES.includes(status)) {
      throw new Error(
        `Upload ${uploadId} cannot be canceled while not in progress, actual status is ${status}`
      );
    }

    // Cancel any web worker currently active just in case
    this.fileReader.cancel(uploadId);

    // If we haven't saved the FSS Job ID this either failed miserably or hasn't progressed much
    let fssStatus;
    const { fssUploadId } = upload.serviceFields;
    if (fssUploadId) {
      try {
        fssStatus = await this.fss.getStatus(fssUploadId);
      } catch (error) {
        // No-op: Unnecessary to care why this failed if it did fail,
        // assume upload is in a bad state and continue failing it
      }

      if (fssStatus) {
        // If FSS has completed the upload it is too late to cancel
        if (fssStatus.status === UploadStatus.COMPLETE) {
          throw new Error(`Upload has progressed too far to be canceled`);
        }

        // Cancel upload in FSS
        await this.fss.cancelUpload(fssUploadId);
      }
    }

    // Update the job to provide feedback
    await this.failUpload(uploadId, "Cancelled by user", true);
  }

  /**
   * Marks the given upload as a failure
   */
  public async failUpload(
    uploadId: string,
    error: string,
    cancelled = false
  ): Promise<void> {
    await this.jss.updateJob(uploadId, {
      status: JSSJobStatus.FAILED,
      serviceFields: {
        cancelled,
        error,
      },
    });
  }

  /**
   * Attempts to resume the given "in progress" chunked upload. This is *not* meant to be
   * used in regular upload circumstances, but rather should be used
   * when an upload was stopped while it was ongoing due to an event
   * like an app crash.
   *
   * This will try to take advantage of any work
   * already done to upload the file.
   */
  private async resume(
    fuaUpload: UploadJob,
    fssStatus: UploadStatusResponse,
    onProgress: (uploadId: string, progress: UploadProgressInfo) => void
  ): Promise<void> {
    const { localNasShortcut, lastModifiedInMS, files } = fuaUpload.serviceFields;
    const { mtime: fileLastModified } = await fs.promises.stat(files[0].file.originalPath);
    const fileLastModifiedInMs = fileLastModified.getTime();
    if (lastModifiedInMS !== fileLastModifiedInMs) {
      throw new Error("File has been modified since last upload attempt");
    }
    switch (fssStatus.status) {
      case UploadStatus.WORKING:
        // Update status to reflect the resume going smoothly
        await this.jss.updateJob(fuaUpload.jobId, {
          status: JSSJobStatus.RETRYING,
        });
        if (localNasShortcut) {
          // For localNasShortcut uploads, the way to reume an in progress upload is to call /register on it again. 
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const [registration, _s, fileSize] = await this.register(fuaUpload);
          this.updateProgress(registration.uploadId, fileSize, (progress: UploadProgressInfo) => onProgress(registration.uploadId, progress))
        } else {
          await this.resumeUploadInChunks(fuaUpload, fssStatus, onProgress);
        }
        break;
      case UploadStatus.RETRY:
        if (localNasShortcut) {
          await this.fss.retryFinalizeLocalNasShortcut(fssStatus.uploadId);
        } else {
          await this.retryChunkedUpload(fssStatus);
        }
        break;
      case UploadStatus.COMPLETE:
        // If an FSS upload status is complete it has performed everything
        // it needs to and may just need the client to finish its portion
        const { fileId } = fssStatus;
        if (!fileId) {
          throw new Error("FileId was not published on COMPLETE upload: " + fssStatus.uploadId)
        }
        await this.complete(fuaUpload, fileId)
        break;
      case UploadStatus.POST_PROCESSING:
        onProgress(fssStatus.uploadId, { bytesUploaded: fssStatus.currentFileSize, totalBytes: fssStatus.currentFileSize });
        break;
      default:
        console.error(`Unexpected FSS UploadStatus encountered: ${fssStatus?.status}`);
        break;
    }
    return;
  }

  private async getChunkedUploadProgress(
    fssStatus: UploadStatusResponse
  ): Promise<[number, string?]> {
    // If FSS is still available to continue receiving chunks of this upload
    // simply continue sending the chunks
    let lastChunkNumber = fssStatus.chunkStatuses.findIndex(
      (status) => status !== UploadStatus.COMPLETE
    );
    if (lastChunkNumber === -1) {
      lastChunkNumber = fssStatus.chunkStatuses.length;
    }

    let partiallyCalculatedMd5 = undefined;
    if (lastChunkNumber > 0) {
      const chunkResponse = await this.fss.getChunkInfo(fssStatus.uploadId, lastChunkNumber);
      partiallyCalculatedMd5 = chunkResponse.cumulativeMD5;
      if (!partiallyCalculatedMd5) {
        throw new Error('No partial MD5 for chunk ' + lastChunkNumber);
      }
    }
    return [lastChunkNumber, partiallyCalculatedMd5];
  }

  private async retryChunkedUpload(
    fssStatus: UploadStatusResponse
  ) {
    const [lastChunkNumber, partiallyCalculatedMd5] = await this.getChunkedUploadProgress(fssStatus);
    if (!partiallyCalculatedMd5) {
      throw new Error('No partial MD5 for chunk ' + lastChunkNumber);
    }
    const deserailizedMd5Hasher = await Md5Hasher.deserialize(partiallyCalculatedMd5);
    await this.fss.retryFinalizeMd5(fssStatus.uploadId, deserailizedMd5Hasher.digest());
  }

  private async resumeUploadInChunks(
    upload: UploadJob,
    fssStatus: UploadStatusResponse,
    onProgress: (uploadId: string, progress: UploadProgressInfo) => void
  ) {
    const { originalPath } = upload.serviceFields.files[0].file;
    const { size: fileSize } = await fs.promises.stat(originalPath);
    const [lastChunkNumber, partiallyCalculatedMd5] = await this.getChunkedUploadProgress(fssStatus);

    await this.uploadInChunks({
      fssStatus,
      source: originalPath,
      user: upload.user,
      onProgress: (bytesUploaded) =>
        onProgress(upload.jobId, { bytesUploaded, totalBytes: fileSize }),
      initialChunkNumber: lastChunkNumber,
      partiallyCalculatedMd5
    });
  }

  private async updateProgress(
    fssUploadId: string,
    fileSize: number,
    onProgress: (progress: UploadProgressInfo) => void) {
    const fssStatusResponse = await this.fss.getStatus(fssUploadId);
    let fssStatus = fssStatusResponse?.status;
    while (fssStatus !== UploadStatus.COMPLETE) {
      await FileManagementSystem.sleep(1000); //TODO too short?  Tests timeout if > 2 sec
      const fssStatusResponse = await this.fss.getStatus(fssUploadId);
      fssStatus = fssStatusResponse?.status;
      switch (fssStatus) {
        case UploadStatus.WORKING:
          onProgress({ bytesUploaded: fssStatusResponse.currentFileSize, totalBytes: fileSize });
          break;
        case UploadStatus.POST_PROCESSING:
          onProgress({ bytesUploaded: fssStatusResponse.currentFileSize, totalBytes: fileSize });
          break;
        case UploadStatus.INACTIVE:
        case UploadStatus.RETRY:
          throw new Error(
            `Something went wrong during a local NAS shortcut upload: ${fssUploadId}.  Upload state is: ${fssStatus}.  Please contact #support_aics_software (on Slack).`
          )
          break;
      }
    }
  }

  /**
   * Uploads the given file to FSS in chunks asynchronously using a NodeJS.
   */
  private async uploadInChunks(config: {
    fssStatus: UploadStatusResponse,
    source: string,
    user: string,
    onProgress: (bytesUploaded: number) => void,
    initialChunkNumber?: number,
    partiallyCalculatedMd5?: string,
  }): Promise<void> {
    const { fssStatus, source, user, onProgress, initialChunkNumber = 0, partiallyCalculatedMd5 } = config;
    const fssUploadId = fssStatus.uploadId;
    const chunkSize = fssStatus.chunkSize;
    let chunkNumber = initialChunkNumber;

    //Initialize bytes uploaded with progress made previously
    onProgress(chunkSize * initialChunkNumber);

    // Throttle the progress callback to avoid sending
    // too many updates on fast uploads
    const throttledOnProgress = throttle(
      onProgress,
      ChunkedFileReader.THROTTLE_DELAY_IN_MS
    );

    let bytesUploaded = initialChunkNumber * chunkSize;
    const uploadChunkPromises: Promise<void>[] = [];

    // For rate throttling how many chunks are sent in parallel
    let chunksInFlight = 0;
    const chunksInFlightLimit = FileManagementSystem.CHUNKS_CEILING_INFLIGHT_REQUEST_CEILING;

    // Handles submitting chunks to FSS, and updating progress
    const uploadChunk = async (chunk: Uint8Array, chunkNumber: number, md5ThusFar: string): Promise<void> => {
      chunksInFlight++;
      // Upload chunk
      await this.fss.sendUploadChunk(
        fssUploadId,
        chunkNumber,
        chunkSize * (chunkNumber - 1),
        md5ThusFar,
        chunk,
        user
      );
      // Submit progress to callback
      bytesUploaded += chunk.byteLength;
      throttledOnProgress(bytesUploaded);
      chunksInFlight--;
    };

    /**
     * A callback for ChunkedFileReader::read
     * Responsible for throttling the reader when the desired number of chunks "in flight" (submitted to fss, and not yet resolved) has been reached.
     * It accomplishes this by checking the state of chunksInFlight, and pausing (reading of the file) if needed.  
     * 
     * When chunksInFlight is not saturated, onChunkRead is also responsible for submitting chunks to this.fss (via uploadChunk) and has the 
     * side effect of populating uploadChunkPromises.
     */
    const onChunkRead = async (chunk: Uint8Array, md5ThusFar: string): Promise<void> => {
      // Throttle how many chunks will be uploaded in parallel
      while (chunksInFlight >= chunksInFlightLimit) {
        await FileManagementSystem.sleep();
      }
      chunkNumber += 1;
      uploadChunkPromises.push(uploadChunk(chunk, chunkNumber, md5ThusFar));
    }
    const offset = chunkSize * initialChunkNumber;
    //TODO only read if offset < fssStatus
    const md5 = await this.fileReader.read({
      uploadId: fssUploadId,
      source,
      onProgress: onChunkRead,
      chunkSize,
      offset,
      partiallyCalculatedMd5,
    });

    //Block until all chunk uploads have completed
    await Promise.all(uploadChunkPromises);

    // Ensure final progress events are sent
    throttledOnProgress.flush();

    // Trigger asynchrous finalize step in FSS
    await this.fss.finalize(fssUploadId, md5);
  }
}

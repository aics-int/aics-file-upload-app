import * as fs from "fs";
import * as path from "path";

import { throttle, uniq } from "lodash";
import * as uuid from "uuid";

import { extensionToFileTypeMap, FileType } from "../../util";
import FileStorageService, {
  FSSUpload,
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

  private static readonly CHUNKS_CEILING_IN_FLIGHT_REQUEST_CEILING_DEFAULT = 20; //ceiling on concurrent chunk requests (even if more can fit in memory)
  private static readonly LARGEST_CUNK_SIZE = 432000000 //Max chunk size tested, from a bug report.  Generated for a 4+TB file SWE-784
  private static readonly LARGEST_SUCCESSFUL_CHUNKS_IN_FLIGHT = 5; //Largest value used (in combination with LARGEST_CUNK_SIZE) in a succesfull test SWE-784
  private static readonly BYTES_IN_FLIGHT_CEILING = FileManagementSystem.LARGEST_CUNK_SIZE * FileManagementSystem.LARGEST_SUCCESSFUL_CHUNKS_IN_FLIGHT;

  /**
   * Returns JSS friendly UUID to group files
   * uploaded together
   */
  public static createUploadGroupId() {
    return uuid.v1().replace(/-/g, "");
  }

  private static sleep(timeoutInMs = 2000){
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
        ...serviceFields,
      },
    });
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
      // Grab file details
      const source = upload.serviceFields.files[0]?.file.originalPath;
      const fileName = path.basename(source);
      const { size: fileSize, mtime: fileLastModified } =
        await fs.promises.stat(source);
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
      );

      // Update parent job with upload job created by FSS
      // for tracking in the event of a retry
      await this.jss.updateJob(upload.jobId, {
        serviceFields: {
          fssUploadId: registration.uploadId,
          lastModifiedInMS: fileLastModifiedInMs,
        },
      });

      // Wait for upload
      await this.uploadInChunks({
        fssUploadId: registration.uploadId,
        source: source,
        chunkSize: registration.chunkSize,
        user: upload.user,
        onProgress: (bytesUploaded) => onProgress({ bytesUploaded, totalBytes: fileSize })
      });
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
    const upload = (await this.jss.getJob(uploadId)) as UploadJob;

    // Avoid attempting to retry a successful job, should be an update in that case
    if (upload.status === JSSJobStatus.SUCCEEDED) {
      throw new Error(
        `Upload cannot be retried if already successful, actual status is ${upload.status}.`
      );
    }

    // Attempt to resume an ongoing upload if possible before scraping this one entirely
    const { fssUploadId } = upload.serviceFields;
    let resumeError: Error | undefined;
    if (fssUploadId) {
      let fssStatus;
      try {
        fssStatus = await this.fss.getStatus(fssUploadId);
      } catch (error) {
        // No-op: move on if this failed
      }

      if (
        fssStatus?.status === UploadStatus.WORKING ||
        fssStatus?.status === UploadStatus.RETRY ||
        fssStatus?.status === UploadStatus.COMPLETE
      ) {
        try {
          await this.resume(upload, fssStatus, onProgress);
          return;
        } catch (error) {
          // Cancel FSS upload to retry again from scratch
          resumeError = error
          await this.fss.cancelUpload(fssUploadId);
        }
      }
    }

    // Start new upload jobs that will replace the current one
    const newJobServiceFields = {
      groupId:
        upload.serviceFields?.groupId ||
        FileManagementSystem.createUploadGroupId(),
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
                    ...(upload?.serviceFields?.replacementJobIds || []),
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
    onProgress: (uploadId: string, progress: UploadProgressInfo) => void
  ): Promise<void> {
    const { fssUploadId, lastModifiedInMS, files } = upload.serviceFields;
    const { mtime: fileLastModified } =
      await fs.promises.stat(files[0].file.originalPath);
    const fileLastModifiedInMs = fileLastModified.getTime();

    if (lastModifiedInMS !== fileLastModifiedInMs) {
      throw new Error("File has been modified since last upload attempt");
    }

    // Skip trying to resume if there is no FSS upload to check
    if (fssUploadId) {
      // Retrive job FSS uses to track its upload portion
      let fssUpload;
      try {
        fssUpload = (await this.jss.getJob(fssUploadId)) as FSSUpload;
      } catch (error) {
        // Because FSS uses a queue to interact with JSS this job
        // may not exist even though the upload is in progress
        // in which case the app can just wait it out
        console.error("Failed to get FSS job")
        return;
      }

      if (fssStatus.status === UploadStatus.COMPLETE) {
        // If an FSS upload status is complete it has performed everything
        // it needs to and may just need the client to finish its portion
        const { fileId } = fssUpload.serviceFields;
        if(!fileId){
          throw new Error("FileId was not published on COMPLETE upload: " + fssStatus.uploadId)
        }
        await this.complete(upload, fileId)
      } else if (fssStatus.status === UploadStatus.RETRY || fssStatus.status === UploadStatus.WORKING) {
        // Update status to reflect the resume going smoothly
        await this.jss.updateJob(upload.jobId, {
          status: JSSJobStatus.RETRYING,
        });

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
          const chunkResponse = await this.fss.getChunkInfo(fssUploadId, lastChunkNumber);
          partiallyCalculatedMd5 = chunkResponse.cumulativeMD5;
          if (!partiallyCalculatedMd5){
            throw new Error('No partial MD5 for chunk ' + lastChunkNumber);
          }
        }

        if (fssStatus.status === UploadStatus.RETRY) {
          if (!partiallyCalculatedMd5){
            throw new Error('No partial MD5 for chunk ' + lastChunkNumber);
          }
          const deserailizedMd5Hasher = await Md5Hasher.deserialize(partiallyCalculatedMd5);
          await this.fss.finalize(fssUploadId, deserailizedMd5Hasher.digest());
        } else if (fssStatus.status === UploadStatus.WORKING) {
          const { originalPath } = upload.serviceFields.files[0].file;
          const { size: fileSize } = await fs.promises.stat(originalPath);
          await this.uploadInChunks({
            fssUploadId,
            source: originalPath,
            chunkSize: fssStatus.chunkSize,
            user: upload.user,
            onProgress: (bytesUploaded) =>
              onProgress(upload.jobId, { bytesUploaded, totalBytes: fileSize }),
            initialChunkNumber: lastChunkNumber,
            partiallyCalculatedMd5
          });
        }
      }
    }
  }

  public static chunksInFlightMaxForChunkSize(chunkSize: number){
    const chunksInFlightForChunkSize = Math.floor(FileManagementSystem.BYTES_IN_FLIGHT_CEILING/chunkSize);
    //Size chunks inInFlight for the chunksSize, but maintain the default ceiling (for small chunk sizes).
    return Math.min(FileManagementSystem.CHUNKS_CEILING_IN_FLIGHT_REQUEST_CEILING_DEFAULT, chunksInFlightForChunkSize);
  }

  /**
   * Uploads the given file to FSS in chunks asynchronously using a NodeJS.
   */
  private async uploadInChunks(config: {
    fssUploadId: string,
    source: string,
    chunkSize: number,
    user: string,
    onProgress: (bytesUploaded: number) => void,
    initialChunkNumber?: number,
    partiallyCalculatedMd5?: string,
  }): Promise<void> {
    const { fssUploadId, source, chunkSize, user, onProgress, initialChunkNumber = 0, partiallyCalculatedMd5 } = config;
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

    const chunksInFlightLimit = FileManagementSystem.chunksInFlightMaxForChunkSize(chunkSize);
    //TODO remove after we observe bugfix effacacy in the field -chrishu 3/7/23
    console.log("chunksInFlightLimit: " + chunksInFlightLimit)
    console.log("chunkSize: " + chunkSize)

    // Handles submitting chunks to FSS, and updating progress
    const uploadChunk = async (chunk: Uint8Array, chunkNumber: number, md5ThusFar: string): Promise<void> => {
      chunksInFlight++;
      // Upload chunk
      await this.fss.sendUploadChunk(
        fssUploadId,
        chunkNumber,
        chunkSize * (chunkNumber-1),
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
    const onChunkRead = async (chunk:Uint8Array, md5ThusFar: string): Promise<void> => {
      // Throttle how many chunks will be uploaded in parallel
      while (chunksInFlight >= chunksInFlightLimit) {
        await FileManagementSystem.sleep();
      }
      chunkNumber += 1;
      uploadChunkPromises.push(uploadChunk(chunk, chunkNumber, md5ThusFar));
    }

    const md5 = await this.fileReader.read({
      uploadId: fssUploadId,
      source,
      onProgress: onChunkRead,
      chunkSize,
      offset: chunkSize * initialChunkNumber,
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

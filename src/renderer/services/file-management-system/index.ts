import * as path from "path";

import * as uuid from "uuid";

import { Step } from "../../containers/Table/CustomCells/StatusCell/Step";
import { extensionToFileTypeMap, FileType } from "../../util";
import FileStorageService, { UploadStatus } from "../file-storage-service";
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

interface FileManagementClientConfig {
  fss: FileStorageService;
  jss: JobStatusService;
  mms: MetadataManagementService;
}

export interface UploadProgressInfo {
  md5BytesComputed?: number;
  bytesUploaded?: number;
  totalBytes: number;
  step: Step;
}

/**
 * Service entity for storing or retrieving files from the AICS FMS. This
 * class is responsible for abstracting the work needed to upload a file into
 * the FMS.
 */
export default class FileManagementSystem {
  private readonly fss: FileStorageService;
  private readonly jss: JobStatusService;
  private readonly mms: MetadataManagementService;

  /**
   * Returns JSS friendly UUID to group files
   * uploaded together
   */
  public static createUploadGroupId() {
    return uuid.v1().replace(/-/g, "");
  }

  public constructor(config: FileManagementClientConfig) {
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
    const jobName =
      metadata.file.customFileName || path.basename(metadata.file.originalPath);
    return this.jss.createJob({
      jobName,
      service: Service.FILE_UPLOAD_APP,
      status: JSSJobStatus.WAITING,
      user,
      serviceFields: {
        files: [metadata],
        type: "upload",
        localNasShortcut: this.shouldBeLocalNasUpload(
          metadata.file.originalPath
        ),
        ...serviceFields,
      },
    });
  }

  public shouldBeLocalNasUpload(path: string) {
    return this.posixPath(path).startsWith("/allen");
  }

  /**
   * Converts Windows style FMS path to Unix style.
   *
   * @param source
   * @returns
   */
  public posixPath(source: string) {
    // Windows is inconsistent here (have seen both 'ALLEN' and Allen' generated in the wild)
    const mntPointForcedLowerCase = source.replace(/allen/gi, "allen");
    // convert path separators from Windows to Unix style.
    const convertedPosix = mntPointForcedLowerCase
      .split(path.sep)
      .join(path.posix.sep);
    // Remove double slash, from windows format
    const replaced = convertedPosix.replace("//", "/");
    return replaced;
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
        customMetadata: metadata.customMetadata
          ? {
              templateId: metadata.customMetadata.templateId,
              annotations: metadata.customMetadata.annotations.filter(
                (annotation) => annotation.values.length > 0
              ),
            }
          : undefined,
        file: {
          ...metadata.file,
          jobId: upload.jobId,
        },
      };
      await this.mms.createFileMetadata(fileId, metadataWithUploadId);

      const { localPath, cloudPath, name } = await this.fss.getFileAttributes(
        fileId
      );
      const readPath = localPath ?? cloudPath;
      await this.jss.updateJob(
        upload.jobId,
        {
          status: JSSJobStatus.SUCCEEDED,
          serviceFields: {
            result: [
              {
                fileId,
                fileName: name,
                readPath,
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
   * Attempts to retry the upload for the given failed job.
   */
  public async retry(uploadId: string): Promise<void> {
    const fuaUpload = (await this.jss.getJob(uploadId)) as UploadJob;

    if (fuaUpload.status === JSSJobStatus.SUCCEEDED) {
      this.succeedUpload(
        uploadId,
        fuaUpload.serviceFields.result?.[0].fileId || "",
        fuaUpload.serviceFields.result?.[0].fileName || "",
        fuaUpload.serviceFields.result?.[0].readPath || ""
      );
      throw new Error(`Upload cannot be retried if already successful.`);
    }

    const { fssUploadId } = fuaUpload.serviceFields;

    if (fssUploadId) {
      // let fss try retry
      await this.fss.retryUpload(fssUploadId);
      return;
    }

    // update existing job with retry info
    await this.jss.updateJob(uploadId, {
      status: JSSJobStatus.WAITING,
      serviceFields: {
        ...fuaUpload.serviceFields,
        error: undefined, // clear previous error
        cancelled: false,
      },
    });

    await this.upload(fuaUpload);
  }

  /**
   * Syncs the upload status for abandoned uploads that may have completed
   * while app is closed. Used on app restart to update any abandoned uploads.
   */
  public async isAbandonedJobComplete(uploadId: string): Promise<boolean> {
    const fuaUpload = (await this.jss.getJob(uploadId)) as UploadJob;

    // checking jss first to see if job is complete there
    if (fuaUpload.status === JSSJobStatus.SUCCEEDED) {
      return true;
    }

    // checking fss next for completion or current status
    const { fssUploadId } = fuaUpload.serviceFields;

    // upload never started in fss
    if (!fssUploadId) {
      return false;
    }

    const fssStatus = await this.fss.getStatus(fssUploadId);

    if (fssStatus.status === UploadStatus.COMPLETE && fssStatus.fileId) {
      // fss reporting complete
      await this.complete(fuaUpload, fssStatus.fileId);
      return true;
    }

    // upload is still in progress
    return false;
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
   * Marks the given upload as a Success
   */
  public async succeedUpload(
    uploadId: string,
    fileId: string,
    fileName: string,
    readPath: string
  ): Promise<void> {
    await this.jss.updateJob(uploadId, {
      status: JSSJobStatus.SUCCEEDED,
      serviceFields: {
        result: [
          {
            fileId,
            fileName,
            readPath,
          },
        ],
      },
    });
  }

  /**
   * Uploads the given file to FSS.
   */
  public async upload(upload: UploadJob): Promise<void> {
    try {
      const source = upload.serviceFields.files[0]?.file.originalPath;
      const customFileName = upload.serviceFields.files[0]?.file.customFileName;
      const fileName = customFileName || path.basename(source);
      const isMultifile = upload.serviceFields?.multifile;
      const shouldBeInLocal =
        upload.serviceFields.files[0]?.file.shouldBeInLocal;

      const fileType =
        extensionToFileTypeMap[path.extname(fileName).toLowerCase()] ||
        FileType.OTHER;

      // v4: single upload call
      const fssStatus = await this.fss.upload(
        fileName,
        fileType,
        this.posixPath(source),
        "VAST", // hard coded for now since we're not planning on bucket to bucket uploads
        isMultifile,
        shouldBeInLocal
      );

      // track using this upload.jobID
      await this.jss.updateJob(upload.jobId, {
        serviceFields: {
          fssUploadId: fssStatus.uploadId,
        },
      });
    } catch (error) {
      await this.jss.updateJob(upload.jobId, {
        status: JSSJobStatus.FAILED,
        serviceFields: {
          ...upload.serviceFields,
          error: error?.message ?? "Upload failed",
        },
      });
      throw error;
    }
  }
}

import * as path from "path";

import * as uuid from "uuid";

import { extensionToFileTypeMap, FileType } from "../../util";
import FileStorageService from "../file-storage-service";
import JobStatusService from "../job-status-service";
import {
  IN_PROGRESS_STATUSES,
  UploadJob,
  JSSJobStatus,
  UploadRequestServiceFields,
} from "../job-status-service/types";
import MetadataManagementService from "../metadata-management-service";
import { UploadRequest } from "../types";

interface FileManagementClientConfig {
  fss: FileStorageService;
  jss: JobStatusService;
  mms: MetadataManagementService;
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
   * Starts the upload in FSS. FSS saves the upload request on the job it
   * creates for the upload so the upload can be completed later.
   */
  public async startUpload(
    metadata: UploadRequest,
    serviceFields: Pick<UploadRequestServiceFields, "groupId" | "multifile">
  ): Promise<void> {
    const source = metadata.file.originalPath;
    const fileName = metadata.file.customFileName || path.basename(source);
    const fileType =
      extensionToFileTypeMap[path.extname(fileName).toLowerCase()] ||
      FileType.OTHER;

    // v4: single upload call
    await this.fss.upload(
      fileName,
      fileType,
      this.posixPath(source),
      "VAST", // hard coded for now since we're not planning on bucket to bucket uploads
      serviceFields.multifile,
      metadata.file.shouldBeInLocal,
      {
        files: [metadata],
        type: "upload",
        localNasShortcut: this.shouldBeLocalNasUpload(source),
        ...serviceFields,
      }
    );
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
   * Finishes the app's portion of the upload once the storage service has
   * stored the file: writes the file's metadata to MMS and records the outcome on the job
   */
  public async complete(upload: UploadJob): Promise<void> {
    const fileId = upload.serviceFields.fileId as string;
    let fileName: string;
    let readPath: string;
    try {
      // Add metadata to file via MMS
      const metadata = upload.serviceFields.uploadRequest?.files[0];
      if (!metadata) {
        throw new Error("Upload has no metadata to write");
      }
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
          jobId: upload.id,
        },
      };
      await this.mms.createFileMetadata(fileId, metadataWithUploadId);

      const { localPath, cloudPath, name } = await this.fss.getFileAttributes(
        fileId
      );
      fileName = name;
      readPath = localPath ?? cloudPath;
    } catch (error) {
      await this.jss.updateJob(upload.id, {
        serviceFields: {
          uploadRequest: {
            metadataWritten: false,
            error: `Something went wrong trying to complete this app's portion of the upload. Details: ${error?.message}`,
          },
        },
      });
      throw error;
    }

    await this.jss.updateJob(upload.id, {
      serviceFields: {
        uploadRequest: {
          metadataWritten: true,
          error: null,
          result: [{ fileId, fileName, readPath }],
        },
      },
    });
  }

  /**
   * Retries the given failed upload. If the storage service already has the
   * file only the app's metadata write is retried.
   */
  public async retry(uploadId: string): Promise<void> {
    const upload = (await this.jss.getJob(uploadId)) as UploadJob;
    const metadataWritten = upload.serviceFields.uploadRequest?.metadataWritten;

    if (metadataWritten === true) {
      throw new Error(`Upload cannot be retried if already successful.`);
    }

    if (metadataWritten === false) {
      await this.complete(upload);
      return;
    }

    await this.fss.retryUpload(uploadId);
    await this.jss.updateJob(uploadId, {
      serviceFields: {
        uploadRequest: {
          error: null,
          cancelled: false,
        },
      },
    });
  }

  /**
   * Attempts to cancel the ongoing upload. Unable to cancel uploads
   * the storage service has already completed.
   */
  public async cancel(uploadId: string): Promise<void> {
    const { status } = await this.jss.getJob(uploadId);

    // Job must be in progress in order to cancel
    if (!IN_PROGRESS_STATUSES.includes(status)) {
      throw new Error(
        `Upload ${uploadId} cannot be canceled while not in progress, actual status is ${status}`
      );
    }

    await this.fss.cancelUpload(uploadId);

    // Update the job to provide feedback
    await this.jss.updateJob(uploadId, {
      status: JSSJobStatus.FAILED,
      error: "Cancelled by user",
      serviceFields: {
        uploadRequest: {
          cancelled: true,
        },
      },
    });
  }
}

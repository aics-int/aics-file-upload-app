import { AxiosRequestConfig } from "axios";

import { JSSJobStatus } from "./job-status-client/types";

export interface HeaderMap {
  [key: string]: string;
}

export interface AicsResponse {
  responseType: "SUCCESS" | "SERVER_ERROR" | "CLIENT_ERROR";
}

export interface AicsSuccessResponse<T> extends AicsResponse {
  data: T[];
  totalCount: number;
  hasMore?: boolean;
  offset: number;
}

export interface HttpClient {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T>;
  put<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T>;
  patch<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T>;
  delete<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T>;
}

export interface FSSResponseFile {
  fileName: string;
  fileId: string;
  readPath: string;
}

interface FileMetadataBlock {
  originalPath: string;
  fileName?: string;
  fileType: string;
  [id: string]: any;
}

// This is used for the POST request to mms for creating file metadata
export interface MMSFileAnnotation {
  annotationId: number;
  values: string[];
}

// This is used for the POST request to mms for creating file metadata
export interface MMSFile {
  annotations: MMSFileAnnotation[];
  templateId?: number;
}

export interface UploadRequest {
  customMetadata?: MMSFile;
  fileType?: string;
  file: FileMetadataBlock;
  [id: string]: any;
}

// properties that belong to both parent and child jobs created through FMS
export interface BaseServiceFields {
  // if user decides to cancel an upload, the app sets this value to true.
  // This will be true only for uploads after 9/21/20 when this heuristic was created. Otherwise, check the error
  // field of serviceFields to see if the upload was cancelled.
  cancelled?: boolean;

  // populated by app when an exception is thrown during an upload
  error?: string;

  // represents the type job this object is representing. It will be equal to the name property of the step or "upload"
  // which is the parent job.
  type: "upload" | "copy" | "copy_child" | "add_metadata";
}

export interface UploadServiceFields extends BaseServiceFields {
  // Populated by app if a file from this upload was deleted
  deletedFileIds?: string[];

  // populated by FSS when the app requests to start an upload.
  files: UploadRequest[];

  // a mapping for all files of this job to their MD5 at the time of the last upload.
  md5: { [originalPath: string]: string };

  // ID of the upload group this job is a part of
  groupId?: string;

  // a mapping for all files of this job to when they were last modified. Used in addition to md5 mapping for
  // determining when to recalculate the MD5.
  // If the file has not been modified, then we can use the MD5 in combination with the file name to determine more
  // quickly if this file would be a duplicate in FMS.
  lastModified: { [originalPath: string]: string };

  // FSS doesn't currently support re-using jobs after an upload gets past the add metadata step.
  // This points to the original job id if this is a replacement job
  originalJobId?: string;

  // DEPRECATED in favor of using replacementJobIds
  // FSS doesn't currently support re-using jobs after an upload gets past the add metadata step.
  // This points to the jobId of the new upload job in case user tries to retry job and the previous jobId is no longer
  // being tracked by FSS. This is populated by the app.
  replacementJobId?: string;

  // FSS doesn't currently support re-using jobs after an upload gets past the add metadata step.
  // This points to the jobIds of the new upload job in case user tries to retry job and the previous jobId is no longer
  // being tracked by FSS. This is populated by the app.
  replacementJobIds?: string[];

  // populated by FSS: https://aicsbitbucket.corp.alleninstitute.org/projects/SW/repos/file-storage-service-java/browse/src/main/java/org/alleninstitute/aics/filestorage/service/UploadJobProcessingService.java#266
  // when the app requests to start an upload.
  result?: FSSResponseFile[];

  // directory where all files of this upload are copied to by this app
  // populated by FSS when the app requests to start an upload.
  uploadDirectory: string;

  // Tracks how many bytes have been processed by FSS during its copy and MD5
  // calculation step. This field is populated by FSS.
  fssBytesProcessed?: number;

  // This object is filled in by processes [services] that run after the initial upload
  // upload clients like this one can gain insight into processes run on the file
  // after upload, for example the FMS Mongo ETL. Property added after 08/02/21.
  postUploadProcessing?: {
    [process: string]: {
      service: string;
      status: JSSJobStatus;
      status_detail?: string;
      service_fields?: {};
      created: Date;
      modified: Date;
    };
  };
}

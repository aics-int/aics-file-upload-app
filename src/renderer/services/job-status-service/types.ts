import { FSSResponseFile, UploadRequest } from "../types";

// The app's fields on the storage service's upload job, stored under `serviceFields.uploadRequest`
export interface UploadRequestServiceFields {
  // Set when the user cancels the upload
  cancelled?: boolean;

  // Why the app's portion of the upload failed. Null clears a previous error.
  error?: string | null;

  // Metadata for the upload file at the time of upload saved
  // to the job to avoid losing it in the event of a failure.
  files: UploadRequest[];

  // Identifies the upload as part of a larger group of uploads
  // useful for grouping uploads that were uploaded together
  groupId?: string;

  // Controls whether the file is send over the network in chunks, or if it is accessible directly via a path on the local NAS.
  localNasShortcut?: boolean;

  // True once the app has written the file's metadata to MMS, false if that failed
  metadataWritten?: boolean;

  // Determines whether an uploaded folder should be interpreted as a "multifile".
  multifile?: boolean;

  // Contains the result of the upload
  result?: FSSResponseFile[];

  // A marker we have used for upload jobs in the past that we are now stuck with
  type: "upload";
}

export interface UploadServiceFields {
  // Set by the storage service once the file has been stored
  fileId?: string;

  // Set by the storage service
  fileSize?: number;

  // This object is filled in by processes [services] that run after the initial upload
  // upload clients like this one can gain insight into processes run on the file
  // after upload, for example the FMS Mongo ETL.
  postUploadProcessing?: {
    [process: string]: {
      service: string;
      status: JSSJobStatus;
      status_detail?: string;
      service_fields?: object;
      created: Date;
      modified: Date;
    };
  };

  // Sent by the app with the upload and saved by the storage service when it creates the job
  uploadRequest?: UploadRequestServiceFields;
}

export interface JSSJob {
  // Name of the most recent host to update the status of the job.
  currentHost?: string;

  // The name of the current stage of the job, for processes that want to track more than status.
  currentStage?: string;

  // Datetime job was created
  created: Date;

  // Why the job failed, if it did
  error?: string;

  // Unique ID for job
  id: string;

  // Human friendly name of the job, if any.
  jobName?: string;

  // Datetime job was last updated
  modified: Date;

  // Host that created the job.
  originationHost?: string;

  // Id of the parent job, or parent process, of this job (if any).
  parentId?: string;

  // Percent complete, 0 to 100
  progress?: number;

  // Name of the service that created or owns this job.
  service?: string;

  // Additional properties required by a specific job or job type.
  serviceFields?: ServiceFields;

  // The status of this job.
  status: JSSJobStatus;

  // If this value is set, and the job has a parent_id, when the status of this job is changed,
  // the parent will be checked for a possible update; if all the children are advanced to a given status,
  // the parent will be advanced.
  updateParent?: boolean;

  // Identifier for the user associated with the job.
  user: string;
}

// Useful for tracking which service owns any given JSS Job
export enum Service {
  FILE_STORAGE_SERVICE = "file-storage-service-2",
}

// The storage service's job for a single upload, `id` is the upload id
export interface UploadJob extends JSSJob {
  jobName: string;
  serviceFields: UploadServiceFields;
}

export interface UpdateJobRequest {
  error?: string;
  status?: JSSJobStatus;
  serviceFields?: {
    uploadRequest?: Partial<UploadRequestServiceFields>;
  };
}

interface MongoFieldQuery {
  $eq?: any;
  $gt?: any;
  $gte?: any;
  $in?: any;
  $lt?: any;
  $lte?: any;
  $ne?: any;
  $nin?: any;
}

export interface JobQuery {
  created?: Date | MongoFieldQuery;
  id?: string | MongoFieldQuery;
  modified?: Date | MongoFieldQuery;
  currentHost?: string | MongoFieldQuery;
  currentStage?: string | MongoFieldQuery;
  jobName?: string | MongoFieldQuery;
  originationHost?: string | MongoFieldQuery;
  parentId?: string | MongoFieldQuery;
  service?: string | MongoFieldQuery;
  serviceFields?: any;
  status?: JSSJobStatus | MongoFieldQuery;
  updateParent?: boolean | MongoFieldQuery;
  user: string | MongoFieldQuery;
  [id: string]: any;
}

export enum JSSJobStatus {
  UNRECOVERABLE = "UNRECOVERABLE",
  FAILED = "FAILED",
  WORKING = "WORKING",
  RETRYING = "RETRYING",
  WAITING = "WAITING",
  BLOCKED = "BLOCKED",
  SUCCEEDED = "SUCCEEDED",
}

export const SUCCESSFUL_STATUS = JSSJobStatus.SUCCEEDED;
export const FAILED_STATUSES = [
  JSSJobStatus.FAILED,
  JSSJobStatus.UNRECOVERABLE,
];
export const IN_PROGRESS_STATUSES = [
  JSSJobStatus.BLOCKED,
  JSSJobStatus.RETRYING,
  JSSJobStatus.WAITING,
  JSSJobStatus.WORKING,
];
export const JOB_STATUSES = [
  SUCCESSFUL_STATUS,
  ...FAILED_STATUSES,
  ...IN_PROGRESS_STATUSES,
];

export type BasicType = boolean | number | string | Date | undefined | null;
export interface ServiceFields {
  [key: string]: any;
}

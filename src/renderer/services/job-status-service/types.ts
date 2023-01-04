import { FSSResponseFile, UploadRequest } from "../types";

export interface UploadServiceFields {
  // Contains the result of the upload
  result?: FSSResponseFile[];

  // If user decides to cancel an upload, the app sets this value to true.
  // This will be true only for uploads after 9/21/20 when this heuristic was created. Otherwise, check the error
  // field of serviceFields to see if the upload was cancelled.
  cancelled?: boolean;

  // Present when the upload fails, contains the error message from
  // the exception caught.
  error?: string;

  // Metadata for the upload file at the time of upload saved
  // to the job to avoid losing it in the event of a failure.
  // Set as an array of potentially > 1 values to be backwards
  // compatible with uploads accomplished with old versions
  // of this app.
  files: UploadRequest[];

  // Unique ID for tracking the upload according to FSS
  fssUploadId?: string;

  // Identifies the upload as part of a larger group of uploads
  // useful for grouping uploads that were uploaded together
  groupId?: string;

  // Tracks the modified date present in the upload file's metadata at the time
  // the MD5 calculation began. If this date is different than the current
  // upload file's metadata it can be concluded that the MD5 may no longer
  // represent the current state of the file.
  lastModifiedInMS?: number;

  // Rather than re-use a FAILED job representing a failed upload, a new one is created by this app.
  // This tracks the original job for posterity.
  originalJobId?: string;

  // Rather than re-use a FAILED job representing a failed upload, a new one is created by this app.
  // This points to 1+ jobs that replace this job as a form of tracking the upload. One job
  // is created for each file present in the upload.
  // More than 1 job should only be present in uploads made by old versions of this app.
  replacementJobIds?: string[];

  // This object is filled in by processes [services] that run after the initial upload
  // upload clients like this one can gain insight into processes run on the file
  // after upload, for example the FMS Mongo ETL. Property added after 08/02/21.
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

  // A marker we have used for upload jobs in the past that we are now stuck with
  // hopefully eventually we can fully rely on using something like the 'service' field
  type: "upload";
}

export interface JSSJob {
  // Array of child ids of this job.
  childIds?: string[];

  // Name of the most recent host to update the status of the job.
  currentHost?: string;

  // The name of the current stage of the job, for processes that want to track more than status.
  currentStage?: string;

  // Datetime job was created
  created: Date;

  // Unique ID for job
  jobId: string;

  // Human friendly name of the job, if any.
  jobName?: string;

  // Datetime job was last updated
  modified: Date;

  // Host that created the job.
  originationHost?: string;

  // Id of the parent job, or parent process, of this job (if any).
  parentId?: string;

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
  FILE_UPLOAD_APP = "file-upload-app",
  FILE_STORAGE_SERVICE = "file-storage-service-2",
}

export interface UploadJob extends JSSJob {
  jobName: string;
  serviceFields: UploadServiceFields;
}

export interface CreateJobRequest
  extends Omit<UploadJob, "jobId" | "created" | "modified"> {
  jobId?: string;
}

export interface UpdateJobRequest
  extends Omit<
    Partial<UploadJob>,
    "jobId" | "created" | "modified" | "user" | "serviceFields"
  > {
  serviceFields?: Partial<UploadServiceFields>;
}

interface MongoFieldQuery {
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
  jobId?: string | MongoFieldQuery;
  modified?: Date | MongoFieldQuery;
  childIds?: string[] | MongoFieldQuery;
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
//TODO why these are here
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

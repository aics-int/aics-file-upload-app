import { FSSResponseFile, UploadRequest } from "../types";

export interface ServiceFields {
  // TODO: Need to handle backwards compatible views of jobs with results fields from FSS
  result?: FSSResponseFile[];

  // If user decides to cancel an upload, the app sets this value to true.
  // This will be true only for uploads after 9/21/20 when this heuristic was created. Otherwise, check the error
  // field of serviceFields to see if the upload was cancelled.
  cancelled?: boolean;

  // Present when the upload fails, contains the error message from
  // the exception caught.
  error?: string;

  // DEPRECATED
  // Previously this app tracked each part of the upload using different jobs
  // assigned different "types", however this is no longer how this app works
  // and all jobs that do not have type "upload" can be ignored.
  type: "upload" | "copy" | "copy_child" | "add_metadata";

  // Metadata for the upload file at the time of upload saved
  // to the job to avoid losing it in the event of a failure.
  // Set as an array of potentially > 1 values to be backwards
  // compatible with uploads accomplished with old versions
  // of this app.
  files: UploadRequest[];

  // TODO:
  fileSize?: number;

  // TODO: Not JSSJob (JSSJob -> UploadJob; fssUpload -> FSSJob)
  fssUpload?: JSSJob;

  // TODO: ????
  fssUploadId?: string;

  fmsFilePath?: string;

  // TODO: ????
  fssUploadChunkSize?: number;

  // Identifies the upload as part of a larger group of uploads
  // useful for grouping uploads that were uploaded together
  groupId?: string;

  // The MD5 hash calculated for this upload file. Tracked in this
  // job to try to avoid re-calculation when possible.
  calculatedMD5?: string;

  // Tracks the modified date present in the upload file's metadata at the time
  // the MD5 calculation occurred. If this date is different than the current
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

  // Tracks how many bytes have been read for the MD5 calculation.
  bytesProcessedForMD5?: number;

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

export interface JobBase {
  // Array of child ids of this job.  Optional, supplied by client
  childIds?: string[];

  // Name of the most recent host to update the status of the job.  Optional, supplied by client
  currentHost?: string;

  // The name of the current stage of the job, for processes that want to track more than status.
  // Optional, supplied by client
  currentStage?: string;

  // Human friendly name of the job, if any. Optional, supplied by client
  jobName?: string;

  // Host that created the job.  Optional, supplied by client
  originationHost?: string;

  // Id of the parent job, or parent process, of this job (if any).  Optional, supplied by client
  parentId?: string;

  // Name of the service that created or owns this job.  Optional, supplied by client
  service?: string;

  // Additional properties required by a specific job or job type.  Optional, supplied by client
  serviceFields: ServiceFields;

  // The status of this job.  Required, supplied by client.
  status: JSSJobStatus;

  // If this value is set, and the job has a parent_id, when the status of this job is changed,
  // the parent will be checked for a possible update; if all the children are advanced to a given status,
  // the parent will be advanced.  Optional, supplied by client
  updateParent?: boolean;

  // Identifier for the user associated with the job.  Required, supplied by client.
  user: string;
}

export interface CreateJobRequest extends JobBase {
  // Unique ID of the job. May be supplied by the client, or will be created by JSS
  jobId?: string;
}

export interface UpdateJobRequest {
  jobName?: string;

  // Array of child ids of this job.
  childIds?: string[];

  // Additional properties required by a specific job or job type.
  serviceFields?: Partial<ServiceFields>;

  // Name of the most recent host to update the status of the job.
  currentHost?: string;

  // The name of the current stage of the job, for processes that want to track more than status.
  currentStage?: string;

  // The status of this job.
  status?: JSSJobStatus;
}

export interface JSSUpdateJobRequest extends JSSServiceFields {
  jobName?: string;
  childIds?: string[];
  currentHost?: string;
  currentStage?: string;
  status?: JSSJobStatus;
}

export interface JSSJob extends JobBase {
  // Datestamp for when the job was originally created.  Required, created by JSS
  created: Date;

  // Unique ID of the job. May be supplied by the client, or will be created by JSS
  jobId: string;

  // Datestamp for when the job was last modified.  Required, created by JSS
  modified: Date;
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

export interface MongoFieldQuery {
  $gt?: any;
  $gte?: any;
  $in?: any;
  $lt?: any;
  $lte?: any;
  $ne?: any;
  $nin?: any;
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
export interface JSSServiceFields {
  [key: string]: any;
}

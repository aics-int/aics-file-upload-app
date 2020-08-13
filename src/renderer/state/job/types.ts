import { JSSJob } from "@aics/job-status-client/type-declarations/types";

import { JobFilter, WriteToStoreAction } from "../types";

export interface RetrieveJobsAction {
  type: string;
}

export interface RetrieveJobsFailedAction {
  payload: string;
  type: string;
}

export interface ReceiveJobsAction {
  payload: {
    addMetadataJobs: JSSJob[];
    copyJobs: JSSJob[];
    incompleteJobIds: string[];
    inProgressUploadJobs: JSSJob[];
    uploadJobs: JSSJob[];
  };
  type: string;
}

export interface HandleAbandonedJobsAction {
  type: string;
}

export interface GatherIncompleteJobIdsAction {
  type: string;
}

export interface UpdateIncompleteJobIdsAction extends WriteToStoreAction {
  payload: string[];
  type: string;
}

export interface SelectJobFilterAction {
  payload: JobFilter;
  type: string;
}

export interface StopJobPollAction {
  type: string;
}

export interface StartJobPollAction {
  payload?: JobFilter;
  type: string;
}

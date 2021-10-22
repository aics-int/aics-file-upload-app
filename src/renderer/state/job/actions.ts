import { JSSJob } from "../../services/job-status-client/types";
import { UploadProgressInfo } from "../types";
import { UPDATE_UPLOAD_PROGRESS_INFO } from "../upload/constants";

import {
  RECEIVE_JOB_INSERT,
  RECEIVE_JOB_UPDATE,
  RECEIVE_JOBS,
  SET_LAST_SELECTED_UPLOAD,
} from "./constants";
import {
  ReceiveJobsAction,
  ReceiveJobInsertAction,
  UpdateUploadProgressInfoAction,
  ReceiveJobUpdateAction,
  SetLastSelectedUploadAction,
} from "./types";

export function receiveJobs(uploadJobs: JSSJob[] = []): ReceiveJobsAction {
  return {
    payload: uploadJobs,
    type: RECEIVE_JOBS,
  };
}

export function receiveJobInsert(job: JSSJob): ReceiveJobInsertAction {
  return {
    payload: job,
    type: RECEIVE_JOB_INSERT,
  };
}

export function receiveJobUpdate(job: JSSJob): ReceiveJobUpdateAction {
  return {
    payload: job,
    type: RECEIVE_JOB_UPDATE,
  };
}

export function setLastSelectedUpload(row?: {
  id: string;
  index: number;
}): SetLastSelectedUploadAction {
  return {
    payload: row,
    type: SET_LAST_SELECTED_UPLOAD,
  };
}

export function updateUploadProgressInfo(
  jobId: string,
  progress: UploadProgressInfo
): UpdateUploadProgressInfoAction {
  return {
    payload: {
      jobId,
      progress,
    },
    type: UPDATE_UPLOAD_PROGRESS_INFO,
  };
}

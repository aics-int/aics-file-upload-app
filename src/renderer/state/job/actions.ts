import { UploadJob } from "../../services/job-status-service/types";

import {
  RECEIVE_JOB_UPDATE,
  RECEIVE_JOBS,
  SET_LAST_SELECTED_UPLOAD,
} from "./constants";
import {
  ReceiveJobsAction,
  ReceiveJobUpdateAction,
  SetLastSelectedUploadAction,
} from "./types";

export function receiveJobs(uploadJobs: UploadJob[] = []): ReceiveJobsAction {
  return {
    payload: uploadJobs,
    type: RECEIVE_JOBS,
  };
}

export function receiveJobUpdate(job: UploadJob): ReceiveJobUpdateAction {
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

import { UploadProgressInfo } from "../../services/file-management-system";
import { UploadJob } from "../../services/job-status-service/types";

export interface ReceiveJobsAction {
  payload: UploadJob[];
  type: string;
}

export interface ReceiveJobInsertAction {
  payload: UploadJob;
  type: string;
}

export interface ReceiveJobUpdateAction {
  payload: UploadJob;
  type: string;
}

export interface SetLastSelectedUploadAction {
  payload?: { id: string; index: number };
  type: string;
}

export interface UpdateUploadProgressInfoAction {
  payload: {
    jobId: string;
    progress: UploadProgressInfo;
  };
  type: string;
}

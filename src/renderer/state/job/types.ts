import { UploadJob } from "../../services/job-status-service/types";

export interface ReceiveJobsAction {
  payload: UploadJob[];
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

import { AnyAction } from "redux";

import { Service, UploadJob } from "../../services/job-status-service/types";
import { JobStateBranch, TypeToDescriptionMap } from "../types";
import { UPDATE_UPLOAD_PROGRESS_INFO } from "../upload/constants";
import { makeReducer } from "../util";

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

export const initialState: JobStateBranch = {
  copyProgress: {},
  uploadJobs: [],
};

const actionToConfigMap: TypeToDescriptionMap<JobStateBranch> = {
  [RECEIVE_JOBS]: {
    accepts: (action: AnyAction): action is ReceiveJobsAction =>
      action.type === RECEIVE_JOBS,
    perform: (
      state: JobStateBranch,
      { payload: uploadJobs }: ReceiveJobsAction
    ) => {
      return {
        ...state,
        uploadJobs,
      };
    },
  },
  [RECEIVE_JOB_INSERT]: {
    accepts: (action: AnyAction): action is ReceiveJobInsertAction =>
      action.type === RECEIVE_JOB_INSERT,
    perform: (
      state: JobStateBranch,
      { payload: newJob }: ReceiveJobInsertAction
    ): JobStateBranch => {
      return {
        ...state,
        uploadJobs: [newJob, ...state.uploadJobs],
      };
    },
  },
  [RECEIVE_JOB_UPDATE]: {
    accepts: (action: AnyAction): action is ReceiveJobUpdateAction =>
      action.type === RECEIVE_JOB_UPDATE,
    perform: (
      state: JobStateBranch,
      { payload: updatedJob }: ReceiveJobUpdateAction
    ): JobStateBranch => {
      if (updatedJob.service !== Service.FILE_UPLOAD_APP) {
        return state;
      }

      return {
        ...state,
        uploadJobs: state.uploadJobs.map((job) =>
          job.jobId === updatedJob.jobId ? updatedJob : job
        ) as UploadJob[],
      };
    },
  },
  [SET_LAST_SELECTED_UPLOAD]: {
    accepts: (action: AnyAction): action is SetLastSelectedUploadAction =>
      action.type === SET_LAST_SELECTED_UPLOAD,
    perform: (state: JobStateBranch, action: SetLastSelectedUploadAction) => ({
      ...state,
      lastSelectedUpload: action.payload,
    }),
  },
  [UPDATE_UPLOAD_PROGRESS_INFO]: {
    accepts: (action: AnyAction): action is UpdateUploadProgressInfoAction =>
      action.type === UPDATE_UPLOAD_PROGRESS_INFO,
    perform: (
      state: JobStateBranch,
      { payload: { jobId, progress } }: UpdateUploadProgressInfoAction
    ) => ({
      ...state,
      copyProgress: {
        ...state.copyProgress,
        [jobId]: progress,
      },
    }),
  },
};

export default makeReducer<JobStateBranch>(actionToConfigMap, initialState);

import { AnyAction } from "redux";

import { JobStateBranch, TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

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

export const initialState: JobStateBranch = {
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
  [RECEIVE_JOB_UPDATE]: {
    accepts: (action: AnyAction): action is ReceiveJobUpdateAction =>
      action.type === RECEIVE_JOB_UPDATE,
    perform: (
      state: JobStateBranch,
      { payload: updatedJob }: ReceiveJobUpdateAction
    ): JobStateBranch => {
      // A job may first appear on an update, once the app has saved its upload request onto it
      const isNewJob = !state.uploadJobs.some(
        (job) => job.id === updatedJob.id
      );
      return {
        ...state,
        uploadJobs: isNewJob
          ? [updatedJob, ...state.uploadJobs]
          : state.uploadJobs.map((job) =>
              job.id === updatedJob.id ? updatedJob : job
            ),
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
};

export default makeReducer<JobStateBranch>(actionToConfigMap, initialState);

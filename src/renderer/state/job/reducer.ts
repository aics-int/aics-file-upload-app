import { filter, includes, uniqBy } from "lodash";
import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import { ADD_PENDING_JOB, REMOVE_PENDING_JOB, SET_COPY_JOBS, SET_UPLOAD_JOBS } from "./constants";
import {
    AddPendingJobAction,
    JobStateBranch,
    RemovePendingJobsAction,
    SetCopyJobsAction,
    SetUploadJobsAction,
} from "./types";

export const initialState = {
    copyJobs: [],
    pendingJobs: [],
    uploadJobs: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [SET_UPLOAD_JOBS]: {
        accepts: (action: AnyAction): action is SetUploadJobsAction => action.type === SET_UPLOAD_JOBS,
        perform: (state: JobStateBranch, action: SetUploadJobsAction) => {
            const uploadJobs = action.payload;
            return {
                ...state,
                uploadJobs,
            };
        },
    },
    [SET_COPY_JOBS]: {
        accepts: (action: AnyAction): action is SetCopyJobsAction => action.type === SET_COPY_JOBS,
        perform: (state: JobStateBranch, action: SetCopyJobsAction) => {
            const copyJobs = action.payload;
            return {
                ...state,
                copyJobs,
            };
        },
    },
    [ADD_PENDING_JOB]: {
        accepts: (action: AnyAction): action is AddPendingJobAction => action.type === ADD_PENDING_JOB,
        perform: (state: JobStateBranch, action: AddPendingJobAction) => {
            return {
                ...state,
                pendingJobs: uniqBy([...state.pendingJobs, action.payload], "jobName"),
            };
        },
    },
    [REMOVE_PENDING_JOB]: {
        accepts: (action: AnyAction): action is RemovePendingJobsAction => action.type === REMOVE_PENDING_JOB,
        perform: (state: JobStateBranch, action: RemovePendingJobsAction) => {
            return {
                ...state,
                pendingJobs: filter(state.pendingJobs, ({jobName}) => !includes(action.payload, jobName)),
            };
        },
    },
};

export default makeReducer<JobStateBranch>(actionToConfigMap, initialState);

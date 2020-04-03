import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { INCOMPLETE_JOB_NAMES_KEY } from "../../../shared/constants";
import {
    ADD_PENDING_JOB,
    GATHER_STORED_INCOMPLETE_JOB_NAMES,
    REMOVE_PENDING_JOB,
    RETRIEVE_JOBS,
    SELECT_JOB_FILTER,
    SET_ADD_METADATA_JOBS,
    SET_COPY_JOBS,
    SET_UPLOAD_JOBS,
    STOP_JOB_POLL,
    UPDATE_INCOMPLETE_JOB_NAMES,
} from "./constants";
import {
    AddPendingJobAction,
    GatherIncompleteJobNamesAction,
    JobFilter,
    PendingJob,
    RemovePendingJobsAction,
    RetrieveJobsAction,
    SelectJobFilterAction,
    SetAddMetadataJobsAction,
    SetCopyJobsAction,
    SetUploadJobsAction,
    StopJobPollAction,
    UpdateIncompleteJobNamesAction,
} from "./types";

export function retrieveJobs(): RetrieveJobsAction {
    return {
        type: RETRIEVE_JOBS,
    };
}

export function setUploadJobs(jobs: JSSJob[]): SetUploadJobsAction {
    return {
        payload: jobs,
        type: SET_UPLOAD_JOBS,
    };
}

export function setCopyJobs(jobs: JSSJob[]): SetCopyJobsAction {
    return {
        payload: jobs,
        type: SET_COPY_JOBS,
    };
}

export function setAddMetadataJobs(jobs: JSSJob[]): SetAddMetadataJobsAction {
    return {
        payload: jobs,
        type: SET_ADD_METADATA_JOBS,
    };
}

export function gatherIncompleteJobNames(): GatherIncompleteJobNamesAction {
    return {
        type: GATHER_STORED_INCOMPLETE_JOB_NAMES,
    };
}

export function updateIncompleteJobNames(incompleteJobNames: string[]): UpdateIncompleteJobNamesAction {
    return {
        payload: incompleteJobNames,
        type: UPDATE_INCOMPLETE_JOB_NAMES,
        updates: {
            [INCOMPLETE_JOB_NAMES_KEY]: incompleteJobNames,
        },
        writeToStore: true,
    };
}

export function addPendingJob(job: PendingJob): AddPendingJobAction {
    return {
        payload: job,
        type: ADD_PENDING_JOB,
    };
}

export function removePendingJobs(jobNames: string[]): RemovePendingJobsAction {
    return {
        payload: jobNames,
        type: REMOVE_PENDING_JOB,
    };
}

export function selectJobFilter(jobFilter: JobFilter): SelectJobFilterAction {
    return {
        payload: jobFilter,
        type: SELECT_JOB_FILTER,
    };
}

export function stopJobPoll(): StopJobPollAction {
    return {
        type: STOP_JOB_POLL,
    };
}

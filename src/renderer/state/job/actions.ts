import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import {
    ADD_PENDING_JOB,
    GATHER_STORED_INCOMPLETE_JOBS,
    REMOVE_PENDING_JOB,
    RETRIEVE_JOBS,
    SELECT_JOB_FILTER,
    SET_ADD_METADATA_JOBS,
    SET_COPY_JOBS,
    SET_UPLOAD_JOBS,
    UPDATE_INCOMPLETE_JOBS,
} from "./constants";
import {
    AddPendingJobAction,
    GatherIncompleteJobsAction,
    JobFilter,
    PendingJob,
    RemovePendingJobsAction,
    RetrieveJobsAction,
    SelectJobFilterAction,
    SetAddMetadataJobsAction,
    SetCopyJobsAction,
    SetUploadJobsAction,
    UpdateIncompleteJobsAction,
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

export function gatherIncompleteJobs(): GatherIncompleteJobsAction {
    return {
        type: GATHER_STORED_INCOMPLETE_JOBS,
    };
}

export function updateIncompleteJobs(jobs: string[]): UpdateIncompleteJobsAction {
    return {
        payload: jobs,
        type: UPDATE_INCOMPLETE_JOBS,
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

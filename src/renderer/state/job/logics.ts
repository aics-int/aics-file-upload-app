import { JobStatusClient } from "@aics/job-status-client";
import { JSSJob } from "@aics/job-status-client/type-declarations/types";
import { isEmpty, without } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";
import { interval } from "rxjs/internal/observable/interval";
import { map, mergeMap } from "rxjs/operators";
import { Error } from "tslint/lib/error";

import { JOB_STORAGE_KEY } from "../../../shared/constants";
import { getWithRetry } from "../../util";

import { addEvent, setAlert } from "../feedback/actions";
import { AlertType, AsyncRequest } from "../feedback/types";
import { getLoggedInUser } from "../setting/selectors";

import {
    LocalStorage,
    Logger,
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
    State,
} from "../types";
import { batchActions } from "../util";

import {
    receiveJobs,
    selectJobFilter,
    stopJobPoll,
    updateIncompleteJobIds,
} from "./actions";
import {
    FAILED_STATUSES,
    GATHER_STORED_INCOMPLETE_JOB_IDS,
    IN_PROGRESS_STATUSES,
    RETRIEVE_JOBS,
    START_JOB_POLL,
    STOP_JOB_POLL,
    SUCCESSFUL_STATUS,
} from "./constants";
import { getIncompleteJobIds, getJobFilter } from "./selectors";
import { JobFilter } from "./types";

interface Jobs {
    actualIncompleteJobIds?: string[];
    addMetadataJobs?: JSSJob[];
    copyJobs?: JSSJob[];
    error?: Error;
    inProgressUploadJobs?: JSSJob[];
    recentlySucceededJobNames?: string[];
    recentlyFailedJobNames?: string[];
    uploadJobs?: JSSJob[];
}

const getJobStatusesToInclude = (jobFilter: JobFilter): string[] => {
    switch (jobFilter) {
        case JobFilter.Successful:
            return [SUCCESSFUL_STATUS];
        case JobFilter.Failed:
            return [...FAILED_STATUSES];
        case JobFilter.InProgress:
            return [...IN_PROGRESS_STATUSES];
        default:
            return [...FAILED_STATUSES, ...SUCCESSFUL_STATUS, ...IN_PROGRESS_STATUSES];
    }
};

export const fetchJobs = async (getStateFn: () => State, jssClient: JobStatusClient): Promise<Jobs> => {
    const statusesToInclude = getJobStatusesToInclude(getJobFilter(getStateFn()));

    const previouslyIncompleteJobIds = getIncompleteJobIds(getStateFn());
    const user = getLoggedInUser(getStateFn());
    const recentlySucceededJobsPromise: Promise<JSSJob[]> = previouslyIncompleteJobIds.length ?
        jssClient.getJobs({
            jobId: { $in: previouslyIncompleteJobIds },
            status: SUCCESSFUL_STATUS,
            user,
        }) : Promise.resolve([]);
    const recentlyFailedJobsPromise: Promise<JSSJob[]> = previouslyIncompleteJobIds.length ?
        jssClient.getJobs({
            jobId: { $in: previouslyIncompleteJobIds },
            status: { $in: FAILED_STATUSES },
            user,
        }) : Promise.resolve([]);
    const getUploadJobsPromise: Promise<JSSJob[]> = jssClient.getJobs({
        serviceFields: {
            type: "upload",
        },
        status: { $in: statusesToInclude },
        user,
    });
    const getInProgressUploadJobsPromise: Promise<JSSJob[]> = jssClient.getJobs({
        serviceFields: {
            type: "upload",
        },
        status: { $in: IN_PROGRESS_STATUSES },
        user,
    });

    try {
        const [
            recentlySucceededJobs,
            recentlyFailedJobs,
            uploadJobs,
            inProgressUploadJobs,
        ] = await Promise.all([
            recentlySucceededJobsPromise,
            recentlyFailedJobsPromise,
            getUploadJobsPromise,
            getInProgressUploadJobsPromise,
        ]);
        const recentlyFailedJobNames: string[] = (recentlyFailedJobs || [])
            .map(({ jobName }: JSSJob) => `${jobName}`);
        const recentlySucceededJobNames: string[] = (recentlySucceededJobs || [])
            .map(({ jobName }: JSSJob) => `${jobName}`);
        const actualIncompleteJobNames = without(previouslyIncompleteJobIds,
            ...recentlySucceededJobNames, ...recentlyFailedJobNames);

        // only get child jobs for the incomplete jobs
        const getCopyJobsPromise = jssClient.getJobs({
            jobName: { $in: actualIncompleteJobNames },
            serviceFields: {
                type: "copy",
            },
            user,
        });
        const getAddMetadataPromise = jssClient.getJobs({
            jobName: { $in: actualIncompleteJobNames },
            serviceFields: {
                type: "add_metadata",
            },
            user,
        });

        return await Promise.all([
            getCopyJobsPromise,
            getAddMetadataPromise,
        ]).then(([
                     copyJobs,
                     addMetadataJobs,
                 ]) => ({
            actualIncompleteJobIds: actualIncompleteJobNames,
            addMetadataJobs,
            copyJobs,
            inProgressUploadJobs,
            recentlyFailedJobNames,
            recentlySucceededJobNames,
            uploadJobs,
        }));
    } catch (error) {
        return { error };
    }
};

export const mapJobsToActions = (
    getState: () => State,
    storage: LocalStorage,
    logger: Logger
) =>
    (jobs: Jobs) => {
    const {
        actualIncompleteJobIds,
        addMetadataJobs,
        copyJobs,
        error,
        inProgressUploadJobs,
        recentlyFailedJobNames,
        recentlySucceededJobNames,
        uploadJobs,
    } = jobs;
    if (error) {
        logger.error(error);
        return addEvent(`Could not retrieve jobs: ${error.message}`, AlertType.ERROR, new Date());
    }

    const actions: AnyAction[] = [];

    let updates: {[jobName: string]: undefined} = {};

    // report the status of jobs that have recently failed and succeeded
    (recentlyFailedJobNames || []).forEach((jobName: string) => {
       actions.push(
           setAlert({
               message: `${jobName} Failed`,
               type: AlertType.ERROR,
           }),
           selectJobFilter(JobFilter.Failed)
       );
    });

    (recentlySucceededJobNames || []).forEach((jobName: string) => {
        actions.push(
            setAlert({
                message: `${jobName} Succeeded`,
                type: AlertType.SUCCESS,
            }),
            selectJobFilter(JobFilter.Failed)
        );
    });

    // Only update the state if the current incompleteJobs are different than the existing ones
    const potentiallyIncompleteJobNames = getIncompleteJobIds(getState());
    if (actualIncompleteJobIds && potentiallyIncompleteJobNames.length !== actualIncompleteJobIds.length) {
        try {
            storage.set(`${JOB_STORAGE_KEY}.incompleteJobNames`, actualIncompleteJobIds);
        } catch (e) {
            logger.warn(`Failed to update incomplete job names: ${actualIncompleteJobIds.join(", ")}`);
        }
        updates = {
            ...updates,
            ...updateIncompleteJobIds(actualIncompleteJobIds).updates, // write incomplete job names to store
        };
        if (actualIncompleteJobIds.length === 0) {
            actions.push(stopJobPoll());
        }
    }
    actions.push(receiveJobs(
        uploadJobs,
        copyJobs,
        addMetadataJobs,
        actualIncompleteJobIds,
        inProgressUploadJobs
    ));
    let nextAction: AnyAction = batchActions(actions);
    if (!isEmpty(updates)) {
        // delete drafts that are no longer pending
        nextAction = {
            ...nextAction,
            updates,
            writeToStore: true,
        };
    }
    return nextAction;
};

const retrieveJobsLogic = createLogic({
    debounce: 500,
    latest: true,
    // Redux Logic's type definitions do not include dispatching observable actions so we are setting
    // the type of dispatch to any
    process: async (deps: ReduxLogicProcessDependencies, dispatch: any, done: ReduxLogicDoneCb) => {
        const { getState, jssClient, logger,  storage } = deps;
        const jobs = await getWithRetry(
            () => fetchJobs(getState, jssClient),
            AsyncRequest.GET_JOBS,
            dispatch,
            "JSS"
        );
        dispatch(mapJobsToActions(getState, storage, logger)(jobs));
        done();
    },
    type: RETRIEVE_JOBS,
    warnTimeout: 0,
});

const pollJobsLogic = createLogic({
    cancelType: STOP_JOB_POLL,
    debounce: 500,
    latest: true,
    process: async (deps: ReduxLogicProcessDependencies, dispatch: any) => {
        const { getState, jssClient, logger,  storage } = deps;
        dispatch(interval(1000)
            .pipe(
                mergeMap(() => {
                    return fetchJobs(getState, jssClient);
                }),
                map(mapJobsToActions(getState, storage, logger))
            ));
    },
    type: START_JOB_POLL,
    warnTimeout: 0,
});

const gatherStoredIncompleteJobNamesLogic = createLogic({
    transform: ({ storage }: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            const incompleteJobNames = storage.get(`${JOB_STORAGE_KEY}.incompleteJobNames`) || [];
            next(updateIncompleteJobIds(incompleteJobNames));
        } catch (e) {
            next(setAlert({
                message: "Failed to get saved incomplete jobs",
                type: AlertType.WARN,
            }));
        }
    },
    type: GATHER_STORED_INCOMPLETE_JOB_IDS,
});

export default [
    retrieveJobsLogic,
    pollJobsLogic,
    gatherStoredIncompleteJobNamesLogic,
];

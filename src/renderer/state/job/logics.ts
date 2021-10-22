import { createLogic } from "redux-logic";

import { CopyCancelledError } from "../../services/fms-client/CopyCancelledError";
import {
  FAILED_STATUSES,
  IN_PROGRESS_STATUSES,
  JSSJob,
  JSSJobStatus,
} from "../../services/job-status-client/types";
import { setErrorAlert, setInfoAlert } from "../feedback/actions";
import {
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicTransformDependencies,
} from "../types";
import { uploadFailed, uploadSucceeded } from "../upload/actions";

import { RECEIVE_JOB_UPDATE, RECEIVE_JOBS } from "./constants";
import { getJobIdToUploadJobMap } from "./selectors";
import { ReceiveJobsAction, ReceiveJobUpdateAction } from "./types";

export const handleAbandonedJobsLogic = createLogic({
  process: async (
    {
      action,
      fms,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<ReceiveJobsAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const abandonedJobs = action.payload.filter(({ status }) =>
      IN_PROGRESS_STATUSES.includes(status)
    );

    await Promise.all(
      abandonedJobs.map(async (abandonedJob) => {
        try {
          // Alert user to abandoned job
          const info = `Upload "${abandonedJob.jobName}" was abandoned and will now be retried.`;
          logger.info(info);
          dispatch(setInfoAlert(info));

          await fms.retry(abandonedJob.jobId);
        } catch (e) {
          if (!(e instanceof CopyCancelledError)) {
            const message = `Retry for upload "${abandonedJob.jobName}" failed: ${e.message}`;
            logger.error(message, e);
            dispatch(setErrorAlert(message));
          }
        }
      })
    );

    done();
  },
  type: RECEIVE_JOBS,
  warnTimeout: 0,
});

// The File Upload App considers a job to be successful and complete when
// the upload job itself as well as the FMS Mongo ETL post upload process
// have a successful status
function isJobSuccessfulAndComplete(job?: JSSJob): boolean {
  return (
    job?.status === JSSJobStatus.SUCCEEDED &&
    job?.serviceFields?.postUploadProcessing?.etl?.status ===
      JSSJobStatus.SUCCEEDED
  );
}

// When the app receives a job update, it will also alert the user if the job update means that a upload succeeded or failed.
const receiveJobUpdateLogics = createLogic({
  process: (
    {
      action,
      ctx,
    }: ReduxLogicProcessDependenciesWithAction<ReceiveJobUpdateAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { payload: updatedJob } = action;
    const jobName = updatedJob.jobName || "";
    const previousJob: JSSJob = ctx.previousJob;

    if (
      isJobSuccessfulAndComplete(updatedJob) &&
      !isJobSuccessfulAndComplete(previousJob)
    ) {
      dispatch(uploadSucceeded(jobName));
    } else if (
      FAILED_STATUSES.includes(updatedJob.status) &&
      !FAILED_STATUSES.includes(previousJob.status) &&
      !updatedJob.serviceFields?.cancelled
    ) {
      const error = `Upload ${jobName} failed${
        updatedJob?.serviceFields?.error
          ? `: ${updatedJob?.serviceFields?.error}`
          : ""
      }`;
      dispatch(uploadFailed(error, jobName));
    }

    done();
  },
  transform: (
    { action, ctx, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const updatedJob: JSSJob = action.payload;
    const jobIdToJobMap = getJobIdToUploadJobMap(getState());
    ctx.previousJob = jobIdToJobMap.get(updatedJob.jobId);
    next(action);
  },
  type: RECEIVE_JOB_UPDATE,
});

export default [handleAbandonedJobsLogic, receiveJobUpdateLogics];

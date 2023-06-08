import { createLogic } from "redux-logic";

import { UploadStatus } from "../../services/file-storage-service";
import {
  FAILED_STATUSES,
  IN_PROGRESS_STATUSES,
  UploadJob,
  JSSJobStatus,
  JSSJob,
} from "../../services/job-status-service/types";
import {
  removeRequestFromInProgress,
  setErrorAlert,
  setInfoAlert,
} from "../feedback/actions";
import { getRequestsInProgress } from "../feedback/selectors";
import {
  AsyncRequest,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
  ReduxLogicTransformDependenciesWithAction,
} from "../types";
import { uploadFailed, uploadSucceeded } from "../upload/actions";
import { UPDATE_UPLOAD_PROGRESS_INFO } from "../upload/constants";

import { updateUploadProgressInfo } from "./actions";
import {
  RECEIVE_JOB_UPDATE,
  RECEIVE_JOBS,
  RECEIVE_FSS_JOB_COMPLETION_UPDATE,
} from "./constants";
import { getJobIdToUploadJobMap, getUploadJobs } from "./selectors";
import {
  ReceiveFSSJobCompletionUpdateAction,
  ReceiveJobsAction,
  ReceiveJobUpdateAction,
} from "./types";

export const handleAbandonedJobsLogic = createLogic({
  process: async (
    {
      action,
      fms,
    }: ReduxLogicProcessDependenciesWithAction<ReceiveJobsAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const abandonedUploads = action.payload.filter(({ status }) =>
      IN_PROGRESS_STATUSES.includes(status)
    );

    await Promise.all(
      abandonedUploads.map(async (abandonedUpload) => {
        try {
          // Alert user to abandoned job
          const info = `Checking to see if "${abandonedUpload.jobName}" was abandoned and can be resumed or retried.`;
          dispatch(setInfoAlert(info));
          await fms.retry(abandonedUpload.jobId);
        } catch (e) {
          const message = `Retry for upload "${abandonedUpload.jobName}" failed: ${e.message}`;
          console.error(message, e);
          dispatch(setErrorAlert(message));
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
function isUploadSuccessfulAndComplete(job?: JSSJob): boolean {
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
    const previousJob: UploadJob | undefined = ctx.previousJob;

    // If the previous job was not successful and complete then the new
    // update shows that is it is then announce to the user that the upload has completed
    if (
      isUploadSuccessfulAndComplete(updatedJob) &&
      !isUploadSuccessfulAndComplete(previousJob)
    ) {
      dispatch(uploadSucceeded(jobName));
    } else if (
      previousJob &&
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
    const updatedJob: UploadJob = action.payload;
    const jobIdToJobMap = getJobIdToUploadJobMap(getState());
    ctx.previousJob = jobIdToJobMap.get(updatedJob.jobId);
    next(action);
  },
  type: RECEIVE_JOB_UPDATE,
});

const receiveFSSJobProgressUpdateLogics = createLogic({ 
  transform: (
    { action, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const fssUpload = action.payload;
    const uploads = getUploadJobs(getState());
    const matchingUploadJob = uploads.find(
      (upload) => upload.serviceFields?.fssUploadId === fssUpload.jobId
    );
    next(updateUploadProgressInfo(matchingUploadJob?.jobId as string, fssUpload.progress));
  },
  type: UPDATE_UPLOAD_PROGRESS_INFO,
});

// Responds to when a newly completed FSS upload job has been found
const receiveFSSJobCompletionUpdateLogics = createLogic({
  process: async (
    {
      action,
      fms,
      getState,
    }: ReduxLogicProcessDependenciesWithAction<ReceiveFSSJobCompletionUpdateAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const fssUpload = action.payload;
    const uploads = getUploadJobs(getState());
    const matchingUploadJob = uploads.find(
      (upload) => upload.serviceFields?.fssUploadId === fssUpload.jobId
    );

    // Ensure this isn't completing the upload more than once
    if (matchingUploadJob) {
      const jobShouldFailAccordingToFSSJobStage = fssUpload.currentStage === UploadStatus.INACTIVE || fssUpload.currentStage === UploadStatus.RETRY;
      const jobHasNotFailedAlready = matchingUploadJob.status !== JSSJobStatus.FAILED;
      if (
        fssUpload.status === JSSJobStatus.SUCCEEDED &&
        matchingUploadJob.status !== JSSJobStatus.SUCCEEDED
      ) {
        await fms.complete(
          matchingUploadJob,
          fssUpload.serviceFields?.fileId as string
        );
      } else if (
        jobShouldFailAccordingToFSSJobStage &&
        jobHasNotFailedAlready
      ) {
        await fms.failUpload(matchingUploadJob.jobId, "FSS upload failed");
      }
    }

    dispatch(
      removeRequestFromInProgress(
        `${AsyncRequest.COMPLETE_UPLOAD}-${fssUpload.jobId}-${fssUpload.status}`
      )
    );
    done();
  },
  validate: (
    {
      action,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<ReceiveFSSJobCompletionUpdateAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const fssUpload = action.payload;
    const keyForRequest = `${AsyncRequest.COMPLETE_UPLOAD}-${fssUpload.jobId}-${fssUpload.status}`;
    const requestsInProgress = getRequestsInProgress(getState());
    const isDuplicateUpdate = requestsInProgress.includes(keyForRequest);
    const isFileIdInLabkey =
      fssUpload.status === JSSJobStatus.SUCCEEDED &&
      fssUpload.serviceFields?.fileId;
    const isFailed = fssUpload.currentStage === UploadStatus.INACTIVE;
    const requiresRetry = fssUpload.currentStage === UploadStatus.RETRY;
    if (
      !isDuplicateUpdate &&
      (isFailed || isFileIdInLabkey || requiresRetry)
    ) {
      next(action);
    } else {
      reject({ type: "ignore" });
    }
  },
  type: RECEIVE_FSS_JOB_COMPLETION_UPDATE,
});

export default [
  handleAbandonedJobsLogic,
  receiveJobUpdateLogics,
  receiveFSSJobProgressUpdateLogics,
  receiveFSSJobCompletionUpdateLogics,
];

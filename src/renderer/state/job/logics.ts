import { castArray } from "lodash";
import { createLogic } from "redux-logic";

import {
  FAILED_STATUSES,
  UploadJob,
  JSSJobStatus,
} from "../../services/job-status-service/types";
import {
  addRequestToInProgress,
  removeRequestFromInProgress,
} from "../feedback/actions";
import { getRequestsInProgress } from "../feedback/selectors";
import {
  AsyncRequest,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicTransformDependencies,
} from "../types";
import { uploadFailed, uploadSucceeded } from "../upload/actions";

import { RECEIVE_JOB_UPDATE, RECEIVE_JOBS } from "./constants";
import { getJobIdToUploadJobMap, getUploadStatus } from "./selectors";
import { ReceiveJobsAction, ReceiveJobUpdateAction } from "./types";

// Once the storage service has stored the file, the app writes the file's metadata.
// This runs for live updates and for uploads that finished while the app was closed.
export const completeUploadsLogic = createLogic({
  process: async (
    {
      action,
      fms,
      getState,
    }: ReduxLogicProcessDependenciesWithAction<
      ReceiveJobsAction | ReceiveJobUpdateAction
    >,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const uploadsNeedingMetadata = castArray(action.payload).filter(
      (job: UploadJob) =>
        job.status === JSSJobStatus.SUCCEEDED &&
        job.serviceFields?.fileId &&
        job.serviceFields.uploadRequest &&
        job.serviceFields.uploadRequest.metadataWritten === undefined
    );

    await Promise.all(
      uploadsNeedingMetadata.map(async (upload) => {
        // Ensure this isn't completing the upload more than once
        const keyForRequest = `${AsyncRequest.COMPLETE_UPLOAD}-${upload.id}`;
        if (getRequestsInProgress(getState()).includes(keyForRequest)) {
          return;
        }
        dispatch(addRequestToInProgress(keyForRequest));
        try {
          await fms.complete(upload);
        } catch (error) {
          // The failure is recorded on the job, the job update alerts the user
          console.error(`Failed to complete upload ${upload.jobName}`, error);
        }
        dispatch(removeRequestFromInProgress(keyForRequest));
      })
    );

    done();
  },
  type: [RECEIVE_JOBS, RECEIVE_JOB_UPDATE],
  warnTimeout: 0,
});

// The File Upload App considers a job to be successful and complete when
// the upload itself as well as the FMS Mongo ETL post upload process
// have a successful status
function isUploadSuccessfulAndComplete(job?: UploadJob): boolean {
  return (
    !!job &&
    getUploadStatus(job) === JSSJobStatus.SUCCEEDED &&
    job.serviceFields?.postUploadProcessing?.etl?.status ===
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
    const uploadRequest = updatedJob.serviceFields?.uploadRequest;

    // If the previous job was not successful and complete then the new
    // update shows that is it is then announce to the user that the upload has completed
    if (
      isUploadSuccessfulAndComplete(updatedJob) &&
      !isUploadSuccessfulAndComplete(previousJob)
    ) {
      dispatch(uploadSucceeded(jobName));
    } else if (
      previousJob &&
      FAILED_STATUSES.includes(getUploadStatus(updatedJob)) &&
      !FAILED_STATUSES.includes(getUploadStatus(previousJob)) &&
      !uploadRequest?.cancelled
    ) {
      const reason = uploadRequest?.error || updatedJob.error;
      const error = `Upload ${jobName} failed${reason ? `: ${reason}` : ""}`;
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
    ctx.previousJob = jobIdToJobMap.get(updatedJob.id);
    next(action);
  },
  type: RECEIVE_JOB_UPDATE,
});

export default [completeUploadsLogic, receiveJobUpdateLogics];

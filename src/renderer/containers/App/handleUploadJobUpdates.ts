import { Dispatch } from "react";

import { FSSUpload } from "../../services/file-storage-service";
import {
  JSSJob,
  JSSJobStatus,
  Service,
  UploadJob,
} from "../../services/job-status-service/types";
import {
  receiveFSSJobCompletionUpdate,
  receiveJobUpdate,
  updateUploadProgressInfo,
} from "../../state/job/actions";

/**
 * Updates the upload progress UI when JSS jobs get updated.
 *
 * @param job JSSJob that has been recently updated.
 * @param dispatch The Redux Dispatch function.
 */
export function handleUploadJobUpdates(job: JSSJob, dispatch: Dispatch<any>) {
  if (job.service === Service.FILE_STORAGE_SERVICE) {
    const fssJob = job as FSSUpload;

    // If a fileId is present, the upload has completed and should be marked as such.
    // If the upload job has failed, mark it as "failed".
    if (
      job.status === JSSJobStatus.SUCCEEDED ||
      job.status === JSSJobStatus.FAILED
    ) {
      // Job is finished, either successfully or with failure
      dispatch(receiveFSSJobCompletionUpdate(fssJob));
    } else {
      // Job still in progress, report progress
      dispatch(
        updateUploadProgressInfo(fssJob.jobId, {
          progress: fssJob.progress,
          currentStage: fssJob.currentStage,
        })
      );
    }
  } else if (job.serviceFields?.type === "upload") {
    // Otherwise separate user's other jobs from ones created by this app
    dispatch(receiveJobUpdate(job as UploadJob));
  }
}

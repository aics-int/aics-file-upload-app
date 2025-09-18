import { Dispatch } from "react";

import { FSSUpload, UploadStatus } from "../../services/file-storage-service";
import {
  JSSJob,
  Service,
  UploadJob,
} from "../../services/job-status-service/types";
import {
  receiveFSSJobCompletionUpdate,
  receiveJobUpdate,
  updateUploadProgressInfo,
} from "../../state/job/actions";
import { Step } from "../Table/CustomCells/StatusCell/Step";

/**
 * Handles job updates for a standard file upload.
 * Reports progress on the pre-upload MD5 step, the upload step, and then the post-upload MD5 step.
 */
function handleFSSJobUpdate(job: FSSUpload, dispatch: Dispatch<any>) {
  const totalBytes = job.serviceFields.fileSize ?? 0;
  const copyProgress = job.serviceFields.copyToFmsCacheProgress; // number | undefined
  const checksumProgress = job.serviceFields.checksumProgress ?? 0;
  const s3Progress = job.serviceFields.s3UploadProgress ?? 0;

  const isHybrid = typeof copyProgress === "number";

  // hybrid upload
  if (isHybrid) {
    if (copyProgress < totalBytes) {
      // copy progress
      dispatch(updateUploadProgressInfo(job.jobId, {
        bytesUploaded: copyProgress,
        totalBytes: totalBytes * 2,  // double totalBytes to account for copy + checksum for step 1
        step: Step.ONE_COPY, 
      }));
    } else if (copyProgress === totalBytes && checksumProgress < totalBytes) {
      // checksum progress
      dispatch(updateUploadProgressInfo(job.jobId, {
        bytesUploaded: totalBytes + checksumProgress,
        totalBytes: totalBytes * 2, // double totalBytes to account for copy + checksum for step 1
        step: Step.ONE_CHECKSUM,
      }));
    } else if (checksumProgress === totalBytes && s3Progress < totalBytes) {
      // upload progress
      dispatch(updateUploadProgressInfo(job.jobId, {
        bytesUploaded: s3Progress,
        totalBytes: totalBytes,
        step: Step.TWO,  // Upload
      }));
    }
  // cloud-only uploads
  } else {
    if (checksumProgress < totalBytes) {
      // update checksum progress as step 1
      dispatch(updateUploadProgressInfo(job.jobId, {
        bytesUploaded: checksumProgress,
        totalBytes: totalBytes,
        step: Step.ONE_CHECKSUM,
      }));
    } else if (checksumProgress === totalBytes && s3Progress < totalBytes) {
      // update s3 upload progress as step 2
      dispatch(updateUploadProgressInfo(job.jobId, {
        bytesUploaded: s3Progress,
        totalBytes: totalBytes,
        step: Step.TWO,
      }));
    }
  }
}

/**
 * Handles a job update for a multifile (.zarr, .sldy) upload.
 * Jumps straight to step 3 of 3 and reports progress as the sum of all bytes uploaded for relevant subfiles divided by
 *  the expected total size of the upload.
 */
function handleFSSMultifileJobUpdate(job: FSSUpload, dispatch: Dispatch<any>) {
  if (job.serviceFields?.subfiles) {
    const totalBytesUploaded: number = Object.values(
      job.serviceFields.subfiles
    ).reduce((accum: number, value: number) => accum + value, 0);
    dispatch(
      updateUploadProgressInfo(job.jobId, {
        bytesUploaded: totalBytesUploaded,
        totalBytes: job.serviceFields?.fileSize || 0,
        step: Step.TWO,
      })
    );
  }
  // TODO?: Maybe raise error here if there is no subfiles?
}

/**
 * Updates the upload progress UI when JSS jobs get updated.
 *
 * @param job JSSJob that has been recently updated.
 * @param dispatch The Redux Dispatch function.
 */
export function handleUploadJobUpdates(job: JSSJob, dispatch: Dispatch<any>) {
  if (job.service === Service.FILE_STORAGE_SERVICE) {
    // An FSS job update happens when:
    //   * fileId has been published
    //   * progress has been published on a pre-upload md5, file upload, or post-upload md5
    //   * progress has been published on a multifile upload's subfile
    //   * the upload app has initialized a retry
    const fssJob = job as FSSUpload;

    // If a fileId is present, the upload has completed and should be marked as such.
    // If the upload job has become inactive or requires a retry, mark it as "failed".
    if (
      job.serviceFields?.fileId ||
      job.currentStage === UploadStatus.INACTIVE ||
      job.currentStage === UploadStatus.RETRY
    ) {
      dispatch(receiveFSSJobCompletionUpdate(fssJob));
    } else {
        // Otherwise, report progress
        if (fssJob.serviceFields?.multifile) {
            handleFSSMultifileJobUpdate(fssJob, dispatch);
        } else {
            handleFSSJobUpdate(fssJob, dispatch);
        }
    }
  } else if (job.serviceFields?.type === "upload") {
    // Otherwise separate user's other jobs from ones created by this app
    dispatch(receiveJobUpdate(job as UploadJob));
  }
}

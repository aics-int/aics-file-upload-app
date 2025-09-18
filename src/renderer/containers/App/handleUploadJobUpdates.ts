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
    } else if (copyProgress === totalBytes) {
      if (checksumProgress < totalBytes) {
        // checksum progress
        dispatch(updateUploadProgressInfo(job.jobId, {
          bytesUploaded: totalBytes + checksumProgress,
          totalBytes: totalBytes * 2, // double totalBytes to account for copy + checksum for step 1
          step: Step.ONE_CHECKSUM,
        }));
      } else if (s3Progress < totalBytes) {
        // upload progress
        dispatch(updateUploadProgressInfo(job.jobId, {
          bytesUploaded: s3Progress,
          totalBytes: totalBytes,
          step: Step.TWO,  // Upload
        })); 
      }
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

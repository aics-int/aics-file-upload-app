import { orderBy } from "lodash";
import { createSelector } from "reselect";

import {
  IN_PROGRESS_STATUSES,
  JSSJobStatus,
  UploadJob,
} from "../../services/job-status-service/types";
import { getTemplateIdToName } from "../metadata/selectors";
import { State, UploadSummaryTableRow } from "../types";

export const getUploadJobs = (state: State) => state.job.uploadJobs;
export const getLastSelectedUpload = (state: State) =>
  state.job.lastSelectedUpload;

// The upload's status from the app's point of view. The storage service marks
// its job SUCCEEDED once it has the file, but the upload is still in progress
// until the app has written the file's metadata.
export function getUploadStatus(job: UploadJob): JSSJobStatus {
  const metadataWritten = job.serviceFields?.uploadRequest?.metadataWritten;
  if (metadataWritten === false) {
    return JSSJobStatus.FAILED;
  }
  if (job.status === JSSJobStatus.SUCCEEDED && !metadataWritten) {
    return JSSJobStatus.WORKING;
  }
  return job.status;
}

export const getJobIdToUploadJobMap = createSelector(
  [getUploadJobs],
  (jobs): Map<string, UploadJob> =>
    jobs.reduce((map, job) => {
      map.set(job.id, job);
      return map;
    }, new Map<string, UploadJob>())
);

export const getRecentUploads = createSelector(
  [getUploadJobs, getTemplateIdToName],
  (uploadJobs, templateIdToName): UploadSummaryTableRow[] =>
    orderBy(uploadJobs, ["created"], ["desc"]).map((job) => {
      const uploadRequest = job.serviceFields?.uploadRequest;
      return {
        ...job,
        status: getUploadStatus(job),
        created: new Date(job.created),
        modified: new Date(job.modified),
        fileId: uploadRequest?.result?.map((file) => file.fileId).join(", "),
        filePath: uploadRequest?.result
          ?.map((file) => file.readPath)
          .join(", "),
        template:
          templateIdToName[
            uploadRequest?.files?.[0]?.customMetadata?.templateId || 0
          ],
      };
    })
);

// Can't close the app if any uploads are currently in progress
// otherwise we are, at the very least, waiting to attach metadata
// to the files
export const getIsSafeToExit = createSelector(
  [getUploadJobs],
  (uploadJobs: UploadJob[]): boolean =>
    !uploadJobs.some((job) =>
      IN_PROGRESS_STATUSES.includes(getUploadStatus(job))
    )
);

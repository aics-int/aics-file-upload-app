import { orderBy } from "lodash";
import { createSelector } from "reselect";

import {
  IN_PROGRESS_STATUSES,
  UploadJob,
} from "../../services/job-status-service/types";
import { getTemplateIdToName } from "../metadata/selectors";
import { State, UploadSummaryTableRow } from "../types";

export const getUploadJobs = (state: State) => state.job.uploadJobs;
export const getJobIdToCopyProgress = (state: State) => state.job.copyProgress;
export const getLastSelectedUpload = (state: State) =>
  state.job.lastSelectedUpload;

export const getJobIdToUploadJobMap = createSelector(
  [getUploadJobs],
  (jobs): Map<string, UploadJob> =>
    jobs.reduce((map, job) => {
      map.set(job.jobId, job);
      return map;
    }, new Map<string, UploadJob>())
);

export const getUploadsByTemplateUsage = createSelector(
  [getUploadJobs, getJobIdToCopyProgress, getTemplateIdToName],
  (
    uploadJobs,
    jobIdToCopyProgress,
    templateIdToName
  ): {
    uploadsWithTemplates: UploadSummaryTableRow[];
    uploadsWithoutTemplates: UploadSummaryTableRow[];
  } => {
    const replacedJobIdSet = uploadJobs.reduce((setSoFar, job) => {
      if (job.serviceFields?.originalJobId) {
        setSoFar.add(job.serviceFields?.originalJobId);
      }
      return setSoFar;
    }, new Set());

    const uploadsWithTemplates: UploadSummaryTableRow[] = [];
    const uploadsWithoutTemplates: UploadSummaryTableRow[] = [];
    orderBy(uploadJobs, ["created"], ["desc"])
      .filter(({ jobId }) => !replacedJobIdSet.has(jobId))
      .forEach((job) => {
        const upload: UploadSummaryTableRow = {
          ...job,
          created: new Date(job.created),
          modified: new Date(job.modified),
          progress: jobIdToCopyProgress[job.jobId],
          fileId: job.serviceFields?.result
            ?.map((file) => file.fileId)
            .join(", "),
          filePath: job.serviceFields?.result
            ?.map((file) => file.readPath)
            .join(", "),
          template:
            templateIdToName[
              job.serviceFields?.files?.[0]?.customMetadata?.templateId || 0
            ],
        };

        if (job.serviceFields?.files?.[0]?.customMetadata) {
          uploadsWithTemplates.push(upload);
        } else {
          uploadsWithoutTemplates.push(upload);
        }
      });

    return { uploadsWithTemplates, uploadsWithoutTemplates };
  }
);

// Can't close the app if any uploads are currently in progress
// otherwise we are, at the very least, waiting to attach metadata
// to the files
export const getIsSafeToExit = createSelector(
  [getUploadJobs],
  (uploadJobs: UploadJob[]): boolean =>
    !uploadJobs.some((job) => IN_PROGRESS_STATUSES.includes(job.status))
);

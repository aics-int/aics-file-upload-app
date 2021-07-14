import { isEqual } from "lodash";
import { createSelector } from "reselect";

import { JSSJob, JSSJobStatus } from "../../services/job-status-client/types";
import { getRequestsInProgress } from "../../state/feedback/selectors";
import { getOriginalUpload } from "../../state/metadata/selectors";
import { getSelectedUploads } from "../../state/selection/selectors";
import { AsyncRequest, UploadStateBranch } from "../../state/types";
import { getUpload, getUploadFileNames } from "../../state/upload/selectors";

export const getUploadInProgress = createSelector(
  [getRequestsInProgress, getUploadFileNames],
  (requestsInProgress: string[], fileNames: string[]) => {
    const uploadRelatedRequests = fileNames.flatMap((file) => [
      `${AsyncRequest.UPDATE_FILE_METADATA}-${file}`,
      `${AsyncRequest.INITIATE_UPLOAD}-${file}`,
    ]);
    return requestsInProgress.some((r) => uploadRelatedRequests.includes(r));
  }
);

export const getCanSubmitUpload = createSelector(
  [getUpload, getSelectedUploads, getOriginalUpload],
  (
    upload: UploadStateBranch,
    selectedUploads: JSSJob[],
    originalUpload?: UploadStateBranch
  ): boolean => {
    if (selectedUploads.some((u) => u.status !== JSSJobStatus.SUCCEEDED)) {
      return false;
    }
    if (!originalUpload) {
      return true;
    }
    return !isEqual(upload, originalUpload);
  }
);

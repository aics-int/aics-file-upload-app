import { expect } from "chai";
import { Action } from "redux-logic";

import { FSSUpload } from "../../../services/file-storage-service";
import {
  JSSJobStatus,
  Service,
} from "../../../services/job-status-service/types";
import { updateUploadProgressInfo } from "../../../state/job/actions";
import { handleUploadJobUpdates } from "../handleUploadJobUpdates";

describe("App", () => {
  describe("handleUploadJobUpdates", () => {
    it("dispatches updateUploadProgressInfo when upload is in progress", () => {
      const fssJob: FSSUpload = {
        created: new Date(),
        currentStage: "CHECKSUM",
        jobId: "foo123",
        jobName: "FMS Upload: test_file.txt",
        modified: new Date(),
        originationHost: "dev-aics-fup-001",
        progress: 40,
        service: Service.FILE_STORAGE_SERVICE,
        updateParent: false,
        user: "fakeuser",
        status: JSSJobStatus.WORKING,
        serviceFields: { fileSize: 10 },
      };

      let actionPersisted: any = undefined;
      const dispatch = (action: Action) => {
        actionPersisted = action;
      };

      handleUploadJobUpdates(fssJob, dispatch);
      expect(actionPersisted).to.deep.equal(
        updateUploadProgressInfo(fssJob.jobId, {
          progress: 40,
          currentStage: "CHECKSUM",
        })
      );
    });
  });
});

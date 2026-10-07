import { expect } from "chai";

import { JSSJobStatus } from "../../../services/job-status-service/types";
import {
  mockSuccessfulUploadJob,
  mockWorkingUploadJob,
} from "../../test/mocks";
import { receiveJobs, receiveJobUpdate } from "../actions";
import reducer from "../reducer";
import { initialState } from "../reducer";

describe("job reducer", () => {
  describe("receiveJobs", () => {
    it("sets uploadJobs", () => {
      const uploadJobs = [mockSuccessfulUploadJob];
      const result = reducer(initialState, receiveJobs(uploadJobs));
      expect(result.uploadJobs).to.equal(uploadJobs);
    });
  });
  describe("receiveJobUpdate", () => {
    it("replaces job with matching id in uploadJobs", () => {
      const updatedJob = {
        ...mockWorkingUploadJob,
        status: JSSJobStatus.SUCCEEDED,
      };
      const result = reducer(
        {
          ...initialState,
          uploadJobs: [mockWorkingUploadJob, mockSuccessfulUploadJob],
        },
        receiveJobUpdate(updatedJob)
      );
      expect(result.uploadJobs).to.deep.equal([
        updatedJob,
        mockSuccessfulUploadJob,
      ]);
    });

    it("adds job to front of uploadJobs if no job has a matching id", () => {
      const result = reducer(
        { ...initialState, uploadJobs: [mockSuccessfulUploadJob] },
        receiveJobUpdate(mockWorkingUploadJob)
      );
      expect(result.uploadJobs).to.deep.equal([
        mockWorkingUploadJob,
        mockSuccessfulUploadJob,
      ]);
    });
  });
});

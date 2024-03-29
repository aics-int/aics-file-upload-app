import { expect } from "chai";

import { Step } from "../../../containers/Table/CustomCells/StatusCell/Step";
import { JSSJobStatus } from "../../../services/job-status-service/types";
import {
  mockSuccessfulUploadJob,
  mockWorkingUploadJob,
} from "../../test/mocks";
import {
  receiveJobInsert,
  receiveJobs,
  receiveJobUpdate,
  updateUploadProgressInfo,
} from "../actions";
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
  describe("receiveJobInsert", () => {
    it("adds job to front of upload job list if serviceFields.type = 'upload'", () => {
      const result = reducer(
        initialState,
        receiveJobInsert(mockWorkingUploadJob)
      );
      expect(result.uploadJobs[0]).to.equal(mockWorkingUploadJob);
    });
  });
  describe("receiveJobUpdate", () => {
    it("replaces job with matching jobId in uploadJobs", () => {
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
      expect(result.uploadJobs[0]).to.equal(updatedJob);
    });

    it("returns original state if job with matching jobId is not found", () => {
      const state = {
        ...initialState,
        uploadJobs: [mockWorkingUploadJob],
      };
      const result = reducer(state, receiveJobUpdate(mockWorkingUploadJob));
      expect(result).to.deep.equal(state);
    });
  });
  describe("updateUploadProgressInfo", () => {
    it("adds progress info for a jobId without overwriting other progress info", () => {
      const newProgress = { md5BytesComputed: 1, totalBytes: 2, step: Step.TWO};
      const result = reducer(
        {
          ...initialState,
          copyProgress: { abc: { md5BytesComputed: 0, totalBytes: 100, step: Step.TWO } },
        },
        updateUploadProgressInfo("def", newProgress)
      );
      expect(result.copyProgress.abc).to.not.be.undefined;
      expect(result.copyProgress.def).to.equal(newProgress);
    });
  });
});

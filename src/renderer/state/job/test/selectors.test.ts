import { expect } from "chai";

import { Step } from "../../../containers/Table/CustomCells/StatusCell/Step";
import {
  UploadJob,
  JSSJobStatus,
} from "../../../services/job-status-service/types";
import {
  mockFailedUploadJob,
  mockState,
  mockSuccessfulUploadJob,
  mockWorkingUploadJob,
  nonEmptyJobStateBranch,
} from "../../test/mocks";
import {
  getIsSafeToExit,
  getJobIdToUploadJobMap,
  getRecentUploads,
} from "../selectors";

describe("Job selectors", () => {
  describe("getUploadsByTemplateUsage", () => {
    it("returns all uploads sorted by created desc", () => {
      // Arrange
      const oldest = {
        ...mockSuccessfulUploadJob,
        created: new Date("Oct 1, 2020"),
      };
      const middle = {
        ...mockWorkingUploadJob,
        created: new Date("Oct 2, 2020"),
      };
      const newest = {
        ...mockFailedUploadJob,
        created: new Date("Oct 3, 2020"),
      };
      const state = {
        ...mockState,
        job: {
          ...nonEmptyJobStateBranch,
          // Provide in non-sorted order to ensure selector sorts
          uploadJobs: [middle, oldest, newest],
          copyProgress: {
            [mockWorkingUploadJob.jobId]: {
              completedBytes: 2,
              totalBytes: 100,
              step: Step.TWO,
            },
          },
        },
      };

      // Act
      const uploads = getRecentUploads(state);

      // Assert
      expect(uploads).to.be.lengthOf(3);
      expect(uploads[0].jobId).to.equal(newest.jobId);
      expect(uploads[1].jobId).to.equal(middle.jobId);
      expect(uploads[2].jobId).to.equal(oldest.jobId);
      for (let i = 0; i < uploads.length - 1; i++) {
        expect(uploads[i].created.getTime()).to.be.greaterThanOrEqual(
          uploads[i + 1].created.getTime()
        );
      }
      const workingUpload = uploads.find(
        (u) => u.status === JSSJobStatus.WORKING
      );
      expect(workingUpload?.progress).to.not.be.undefined;
    });

    it("hides any jobs that are duplicates of the original", () => {
      // Arrange
      const mockReplacedJob1: UploadJob = {
        ...mockFailedUploadJob,
        created: new Date("Oct 2, 2020 03:24:00"),
        jobId: "replacement1",
      };
      const mockReplacedJob2: UploadJob = {
        ...mockFailedUploadJob,
        created: new Date("Oct 3, 2020 03:24:00"),
        jobId: "replacement2",
        status: JSSJobStatus.RETRYING,
        serviceFields: {
          ...mockFailedUploadJob.serviceFields,
          originalJobId: mockReplacedJob1.jobId,
        },
      };
      const expectedJob: UploadJob = {
        ...mockFailedUploadJob,
        created: new Date("Oct 1, 2020 03:24:00"),
        serviceFields: {
          files: [],
          lastModifiedInMS: new Date().getMilliseconds(),
          originalJobId: mockReplacedJob2.jobId,
          type: "upload",
        },
      };

      // Act
      const uploads = getRecentUploads({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [expectedJob, mockReplacedJob1, mockReplacedJob2],
        },
      });

      // Assert
      expect(uploads).to.be.lengthOf(1);
      expect(uploads[0].jobId).to.equal(expectedJob.jobId);
    });
  });

  describe("getIsSafeToExit", () => {
    it("returns false if an upload job is in progress", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [mockWorkingUploadJob, mockFailedUploadJob],
        },
      });
      expect(isSafeToExit).to.be.false;
    });

    it("returns true if no jobs", () => {
      const isSafeToExit = getIsSafeToExit(mockState);
      expect(isSafeToExit).to.be.true;
    });

    it("returns true if there are no in progress jobs", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [mockFailedUploadJob, mockSuccessfulUploadJob],
        },
      });
      expect(isSafeToExit).to.be.true;
    });
  });

  describe("getJobIdToUploadJobMap", () => {
    it("converts a list of jobs to a map of jobId's to jobs", () => {
      const map = getJobIdToUploadJobMap({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [mockWorkingUploadJob, mockSuccessfulUploadJob],
        },
      });
      expect(map.size).to.equal(2);
      expect(map.get(mockWorkingUploadJob.jobId)).to.equal(
        mockWorkingUploadJob
      );
      expect(map.get(mockSuccessfulUploadJob.jobId)).to.equal(
        mockSuccessfulUploadJob
      );
    });
  });
});

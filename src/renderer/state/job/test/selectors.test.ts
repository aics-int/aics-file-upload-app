import { expect } from "chai";

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
  getUploadStatus,
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
        },
      };

      // Act
      const uploads = getRecentUploads(state);

      // Assert
      expect(uploads).to.be.lengthOf(3);
      expect(uploads[0].id).to.equal(newest.id);
      expect(uploads[1].id).to.equal(middle.id);
      expect(uploads[2].id).to.equal(oldest.id);
      for (let i = 0; i < uploads.length - 1; i++) {
        expect(uploads[i].created.getTime()).to.be.greaterThanOrEqual(
          uploads[i + 1].created.getTime()
        );
      }
    });

    it("reads file id and path from the upload request result", () => {
      const uploads = getRecentUploads({
        ...mockState,
        job: { ...mockState.job, uploadJobs: [mockSuccessfulUploadJob] },
      });

      expect(uploads[0].fileId).to.equal("cat, dog");
      expect(uploads[0].filePath).to.equal("cat, cat");
    });
  });

  describe("getUploadStatus", () => {
    it("is in progress while the app has not written metadata for a stored file", () => {
      const job: UploadJob = {
        ...mockSuccessfulUploadJob,
        serviceFields: {
          fileId: "cat",
          uploadRequest: { files: [], type: "upload" },
        },
      };
      expect(getUploadStatus(job)).to.equal(JSSJobStatus.WORKING);
    });

    it("is failed when writing metadata failed", () => {
      const job: UploadJob = {
        ...mockSuccessfulUploadJob,
        serviceFields: {
          fileId: "cat",
          uploadRequest: { files: [], type: "upload", metadataWritten: false },
        },
      };
      expect(getUploadStatus(job)).to.equal(JSSJobStatus.FAILED);
    });

    it("is succeeded once metadata is written", () => {
      expect(getUploadStatus(mockSuccessfulUploadJob)).to.equal(
        JSSJobStatus.SUCCEEDED
      );
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
    it("converts a list of jobs to a map of job ids to jobs", () => {
      const map = getJobIdToUploadJobMap({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [mockWorkingUploadJob, mockSuccessfulUploadJob],
        },
      });
      expect(map.size).to.equal(2);
      expect(map.get(mockWorkingUploadJob.id)).to.equal(mockWorkingUploadJob);
      expect(map.get(mockSuccessfulUploadJob.id)).to.equal(
        mockSuccessfulUploadJob
      );
    });
  });
});

import { expect } from "chai";

import {
  JSSJob,
  JSSJobStatus,
} from "../../../services/job-status-client/types";
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
  getUploadsByTemplateUsage,
} from "../selectors";

describe("Job selectors", () => {
  describe("getUploadsByTemplateUsage", () => {
    it("divides jobs by if they have been used with a template", () => {
      // Arrange
      const state = {
        ...mockState,
        job: {
          ...nonEmptyJobStateBranch,
          copyProgress: {
            [mockWorkingUploadJob.jobId]: {
              completedBytes: 2,
              totalBytes: 100,
            },
          },
        },
      };
      const jobs = [...nonEmptyJobStateBranch.uploadJobs];

      // Act
      const {
        uploadsWithTemplates,
        uploadsWithoutTemplates,
      } = getUploadsByTemplateUsage(state);

      // Assert
      expect(uploadsWithTemplates).to.be.lengthOf(1);
      expect(uploadsWithoutTemplates).to.be.lengthOf(2);
      let foundWorkingJob = false;
      uploadsWithoutTemplates.forEach((jobTableRow) => {
        const match = jobs.find((job) => {
          return (
            job.jobName === jobTableRow.jobName &&
            job.jobId === jobTableRow.jobId &&
            job.currentStage === jobTableRow.currentStage &&
            job.status === jobTableRow.status
          );
        });
        if (jobTableRow.status === JSSJobStatus.WORKING) {
          expect(jobTableRow.progress).to.not.be.undefined;
          foundWorkingJob = true;
        }
        expect(match).to.not.be.undefined;
      });
      expect(foundWorkingJob).to.be.true;
    });

    it("hides any jobs that are duplicates of the original", () => {
      // Arrange
      const mockReplacedJob1: JSSJob = {
        ...mockFailedUploadJob,
        created: new Date("Oct 2, 2020 03:24:00"),
        jobId: "replacement1",
      };
      const mockReplacedJob2: JSSJob = {
        ...mockFailedUploadJob,
        created: new Date("Oct 3, 2020 03:24:00"),
        jobId: "replacement2",
        status: JSSJobStatus.RETRYING,
        serviceFields: {
          ...mockFailedUploadJob.serviceFields,
          originalJobId: mockReplacedJob1.jobId,
        },
      };
      const expectedJob: JSSJob = {
        ...mockFailedUploadJob,
        created: new Date("Oct 1, 2020 03:24:00"),
        serviceFields: {
          files: [],
          lastModifiedInMS: new Date().getMilliseconds(),
          calculatedMD5: "123412341234",
          originalJobId: mockReplacedJob2.jobId,
          type: "upload",
        },
      };

      // Act
      const {
        uploadsWithTemplates,
        uploadsWithoutTemplates,
      } = getUploadsByTemplateUsage({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [expectedJob, mockReplacedJob1, mockReplacedJob2],
        },
      });

      // Assert
      expect(uploadsWithTemplates).to.be.lengthOf(0);
      expect(uploadsWithoutTemplates).to.be.lengthOf(1);
      expect(uploadsWithoutTemplates[0].jobId).to.equal(expectedJob.jobId);
    });
  });

  describe("getIsSafeToExit", () => {
    it("returns false if an upload job is in progress and in client upload stage", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [
            {
              ...mockWorkingUploadJob,
            },
          ],
        },
      });
      expect(isSafeToExit).to.be.false;
    });

    it("returns true if no jobs", () => {
      const isSafeToExit = getIsSafeToExit(mockState);
      expect(isSafeToExit).to.be.true;
    });

    it("returns true if an upload job is in progress and not in client upload stage", () => {
      const isSafeToExit = getIsSafeToExit({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [
            {
              ...mockWorkingUploadJob,
            },
          ],
        },
      });
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

import { expect } from "chai";

import {
  JSSJob,
  JSSJobStatus,
  UploadStage,
} from "../../../services/job-status-client/types";
import {
  mockFailedUploadJob,
  mockState,
  mockSuccessfulUploadJob,
  mockWorkingUploadJob,
  nonEmptyJobStateBranch,
} from "../../test/mocks";
import { JobFilter, State } from "../../types";
import {
  getFilteredJobs,
  getIsSafeToExit,
  getJobsForTable,
  getUploadGroupToUploads,
} from "../selectors";

describe("Job selectors", () => {
  describe("getJobsForTable", () => {
    it("converts jobs in redux store to objects used by upload summary page", () => {
      const jobs = [...nonEmptyJobStateBranch.uploadJobs];
      const jobTableRows = getJobsForTable({
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
      });

      expect(jobTableRows.length).to.equal(jobs.length);
      let foundWorkingJob = false;
      jobTableRows.forEach((jobTableRow) => {
        const match = jobs.find((job) => {
          return (
            job.jobName === jobTableRow.jobName &&
            job.jobId === jobTableRow.key &&
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
          lastModified: {},
          md5: {},
          originalJobId: mockReplacedJob2.jobId,
          type: "upload",
          uploadDirectory: "/foo",
        },
      };

      // Act
      const rows = getJobsForTable({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [expectedJob, mockReplacedJob1, mockReplacedJob2],
        },
      });

      // Assert
      expect(rows).to.be.lengthOf(1);
      expect(rows[0].jobId).to.equal(expectedJob.jobId);
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
              currentStage: UploadStage.WAITING_FOR_CLIENT_COPY,
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
              currentStage: UploadStage.COMPLETE,
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

  describe("getUploadGroupToUploads", () => {
    it("groups uploads by serviceFields.groupId", () => {
      const groupId1 = "first-group-id";
      const groupId2 = "second-group-id";
      const job1 = {
        ...mockFailedUploadJob,
        serviceFields: {
          ...mockFailedUploadJob.serviceFields,
          groupId: groupId1,
        },
      };
      const job2 = {
        ...mockFailedUploadJob,
        serviceFields: {
          ...mockSuccessfulUploadJob.serviceFields,
          groupId: groupId2,
        },
      };
      const job3 = {
        ...mockWorkingUploadJob,
        serviceFields: {
          ...mockWorkingUploadJob,
          groupId: groupId1,
        },
      };
      const actual = getUploadGroupToUploads({
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [job1, job2, job3],
        },
      });
      expect(actual).to.deep.equal({
        [groupId1]: [job1, job3],
        [groupId2]: [job2],
      });
    });
  });

  describe("getFilteredJobs", () => {
    let state: State;
    let mockRetryingUploadJob: JSSJob,
      mockUnrecoverableUploadJob: JSSJob,
      mockBlockedUploadJob: JSSJob;
    beforeEach(() => {
      mockRetryingUploadJob = {
        ...mockWorkingUploadJob,
        status: JSSJobStatus.RETRYING,
      };
      mockUnrecoverableUploadJob = {
        ...mockFailedUploadJob,
        status: JSSJobStatus.UNRECOVERABLE,
      };
      mockBlockedUploadJob = {
        ...mockFailedUploadJob,
        status: JSSJobStatus.BLOCKED,
      };
      state = {
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [
            mockWorkingUploadJob,
            mockSuccessfulUploadJob,
            mockFailedUploadJob,
            mockRetryingUploadJob,
            mockUnrecoverableUploadJob,
            mockBlockedUploadJob,
          ],
        },
      };
    });
    it("returns succeeded jobs if succeeded job filter selected", () => {
      const jobs = getFilteredJobs({
        ...state,
        job: {
          ...state.job,
          jobFilter: JobFilter.Successful,
        },
      });
      expect(jobs).to.deep.equal([mockSuccessfulUploadJob]);
    });
    it("returns failed and unrecoverable jobs if failed job filter selected", () => {
      const jobs = getFilteredJobs({
        ...state,
        job: {
          ...state.job,
          jobFilter: JobFilter.Failed,
        },
      });
      expect(jobs).to.deep.equal([
        mockFailedUploadJob,
        mockUnrecoverableUploadJob,
      ]);
    });
    it("returns working and retrying jobs if in progress job filter selected", () => {
      const jobs = getFilteredJobs({
        ...state,
        job: {
          ...state.job,
          jobFilter: JobFilter.InProgress,
        },
      });
      expect(jobs).to.deep.equal([
        mockWorkingUploadJob,
        mockRetryingUploadJob,
        mockBlockedUploadJob,
      ]);
    });
    it("does not filter out any jobs if All job filter selected", () => {
      const jobs = getFilteredJobs({
        ...state,
        job: {
          ...state.job,
          jobFilter: JobFilter.All,
        },
      });
      expect(jobs).to.deep.equal(state.job.uploadJobs);
    });
  });
});

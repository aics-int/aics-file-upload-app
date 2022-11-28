import { expect } from "chai";
import { createSandbox, createStubInstance, SinonStubbedInstance } from "sinon";

import { FileManagementSystem, JobStatusService } from "../../../services";
import { FSSUpload, UploadStatus } from "../../../services/file-storage-service";
import {
  IN_PROGRESS_STATUSES,
  JSSJobStatus,
  UploadJob,
} from "../../../services/job-status-service/types";
import { setErrorAlert, setInfoAlert } from "../../feedback/actions";
import { SET_ALERT } from "../../feedback/constants";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
  ReduxLogicDependencies,
} from "../../test/configure-mock-store";
import {
  mockFailedUploadJob,
  mockState,
  mockSuccessfulUploadJob,
  mockWaitingUploadJob,
  mockWorkingUploadJob,
} from "../../test/mocks";
import { State } from "../../types";
import { uploadFailed, uploadSucceeded } from "../../upload/actions";
import {
  receiveFSSJobCompletionUpdate,
  receiveJobs,
  receiveJobUpdate,
} from "../actions";
import { RECEIVE_FSS_JOB_COMPLETION_UPDATE } from "../constants";
import { handleAbandonedJobsLogic } from "../logics";

describe("Job logics", () => {
  const sandbox = createSandbox();
  let jssClient: SinonStubbedInstance<JobStatusService>;
  let fms: SinonStubbedInstance<FileManagementSystem>;

  beforeEach(() => {
    jssClient = createStubInstance(JobStatusService);
    fms = createStubInstance(FileManagementSystem);
    sandbox.replace(mockReduxLogicDeps, "jssClient", jssClient);
    sandbox.replace(mockReduxLogicDeps, "fms", fms);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("handleAbandonedJobsLogic", () => {
    let logicDeps: ReduxLogicDependencies;
    let waitingAbandonedJob: UploadJob;

    beforeEach(() => {
      waitingAbandonedJob = {
        ...mockWaitingUploadJob,
        jobId: "abandoned_job_id",
        jobName: "abandoned_job",
        childIds: ["child_job_id"],
        serviceFields: {
          files: [
            {
              customMetadata: { annotations: [], templateId: 1 },
              file: { fileType: "image", originalPath: "test_path" },
            },
          ],
          type: "upload",
        },
      };
    });

    it("does not do anything if no abandoned jobs", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState,
        logicDeps,
        [handleAbandonedJobsLogic]
      );

      store.dispatch(
        receiveJobs([mockFailedUploadJob, mockSuccessfulUploadJob])
      );

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        receiveJobs([mockFailedUploadJob, mockSuccessfulUploadJob]),
      ]);
      expect(fms.retry).to.not.have.been.called;
    });

    it("finds and retries any job that didn't get past the add metadata step", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState,
        logicDeps,
        [handleAbandonedJobsLogic]
      );
      const action = receiveJobs([mockFailedUploadJob, waitingAbandonedJob]);

      store.dispatch(action);
      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        action,
        setInfoAlert(
          `Checking to see if "${waitingAbandonedJob.jobName}" was abandoned and can be resumed or retried.`
        ),
      ]);
    });

    it("finds and retries one abandoned job", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState,
        logicDeps,
        [handleAbandonedJobsLogic]
      );

      store.dispatch(receiveJobs([waitingAbandonedJob]));

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        receiveJobs([waitingAbandonedJob]),
        setInfoAlert(
          `Checking to see if "${waitingAbandonedJob.jobName}" was abandoned and can be resumed or retried.`
        ),
      ]);
    });

    it("sets error alert if an error is thrown", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState,
        logicDeps,
        [handleAbandonedJobsLogic]
      );
      const errorMessage = "retry failure!";
      fms.retry.onFirstCall().rejects(new Error(errorMessage));

      store.dispatch(receiveJobs([waitingAbandonedJob]));

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        receiveJobs([waitingAbandonedJob]),
        setInfoAlert(
          `Checking to see if "${waitingAbandonedJob.jobName}" was abandoned and can be resumed or retried.`
        ),
        setErrorAlert(
          `Retry for upload "${waitingAbandonedJob.jobName}" failed: ${errorMessage}`
        ),
      ]);
    });

    it("dispatches setErrorAlert if fms.retry fails", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState,
        logicDeps,
        [handleAbandonedJobsLogic]
      );

      fms.retry.rejects(new Error("Error"));

      store.dispatch(receiveJobs([waitingAbandonedJob]));

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        receiveJobs([waitingAbandonedJob]),
        setInfoAlert(
          `Checking to see if "${waitingAbandonedJob.jobName}" was abandoned and can be resumed or retried.`
        ),
        setErrorAlert('Retry for upload "abandoned_job" failed: Error'),
      ]);
    });
  });

  describe("receiveJobUpdateLogics", () => {
    let mockStateWithNonEmptyUploadJobs: State;
    beforeEach(() => {
      mockStateWithNonEmptyUploadJobs = {
        ...mockState,
        job: {
          ...mockState.job,
          uploadJobs: [mockWorkingUploadJob],
        },
      };
    });

    it("dispatches no additional actions if the job is in progress", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithNonEmptyUploadJobs
      );

      store.dispatch(receiveJobUpdate(mockWorkingUploadJob));

      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([
        receiveJobUpdate(mockWorkingUploadJob),
      ]);
    });

    it("does not dispatch uploadSucceeded if the ETL has not successfully completed", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithNonEmptyUploadJobs,
        undefined,
        undefined,
        false
      );
      const action = receiveJobUpdate({
        ...mockSuccessfulUploadJob,
        serviceFields: {
          ...mockWorkingUploadJob.serviceFields,
        },
        jobId: mockWorkingUploadJob.jobId,
      });

      store.dispatch(action);

      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([action]);
    });

    it("dispatches uploadSucceeded if the job is an upload job that succeeded and previously was in progress", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithNonEmptyUploadJobs,
        undefined,
        undefined,
        false
      );
      const action = receiveJobUpdate({
        ...mockSuccessfulUploadJob,
        jobId: mockWorkingUploadJob.jobId,
      });

      store.dispatch(action);

      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([
        action,
        uploadSucceeded(mockSuccessfulUploadJob.jobName || ""),
      ]);
    });
    it("dispatches uploadFailed if the job is an upload that failed and previously was in progress", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithNonEmptyUploadJobs,
        undefined,
        undefined,
        false
      );
      const action = receiveJobUpdate({
        ...mockFailedUploadJob,
        jobId: mockWorkingUploadJob.jobId,
        jobName: "someJobName",
        serviceFields: {
          ...mockFailedUploadJob.serviceFields,
          error: "foo",
        },
      });

      store.dispatch(action);

      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([
        action,
        uploadFailed("Upload someJobName failed: foo", "someJobName"),
      ]);
    });
  });

  describe("receiveFSSJobCompletionUpdate", () => {
    const fssUploadId = "9201341324";
    const stateWithMatchingUpload = {
      ...mockState,
      job: {
        ...mockState.job,
        uploadJobs: [
          {
            ...mockWorkingUploadJob,
            serviceFields: {
              ...mockWorkingUploadJob.serviceFields,
              fssUploadId,
            },
          },
        ],
      },
    };
    const successfulFSSUpload: FSSUpload = {
      ...mockSuccessfulUploadJob,
      jobId: fssUploadId,
      serviceFields: {
        fileId: "9203414",
      },
    };

    it("completes upload only once if multiple FSS updates occur", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore(
        stateWithMatchingUpload,
        undefined,
        undefined,
        false
      );

      // Act
      store.dispatch(receiveFSSJobCompletionUpdate(successfulFSSUpload));
      store.dispatch(receiveFSSJobCompletionUpdate(successfulFSSUpload));
      store.dispatch(receiveFSSJobCompletionUpdate(successfulFSSUpload));
      await logicMiddleware.whenComplete();

      // Assert
      expect(fms.complete).to.have.been.calledOnce;
      expect(
        actions.list.filter(
          (action) => action.type === RECEIVE_FSS_JOB_COMPLETION_UPDATE
        )
      ).to.be.lengthOf(1);
    });

    it("fails upload if FSS job failed", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore(
        stateWithMatchingUpload,
        undefined,
        undefined,
        false
      );
      const fssUpload = {
        ...successfulFSSUpload,
        status: JSSJobStatus.FAILED,
      };

      // Act
      store.dispatch(receiveFSSJobCompletionUpdate(fssUpload));
      await logicMiddleware.whenComplete();

      // Assert
      expect(fms.failUpload).to.have.been.calledOnce;
      expect(actions.includesType(RECEIVE_FSS_JOB_COMPLETION_UPDATE)).to.be
        .true;
    });

    it("rejects updates without file ids", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore(
        stateWithMatchingUpload,
        undefined,
        undefined,
        false
      );
      const fssUpload = {
        ...successfulFSSUpload,
        serviceFields: {
          ...successfulFSSUpload.serviceFields,
          fileId: undefined,
        },
      };

      // Act
      const action = receiveFSSJobCompletionUpdate(fssUpload);
      store.dispatch(action);
      await logicMiddleware.whenComplete();

      // Assert
      expect(actions.includesType(RECEIVE_FSS_JOB_COMPLETION_UPDATE)).to.be
        .false;
    });

    IN_PROGRESS_STATUSES.forEach((status) => {
      it(`rejects updates with ${status} status`, async () => {
        // Arrange
        const { actions, logicMiddleware, store } = createMockReduxStore(
          stateWithMatchingUpload,
          undefined,
          undefined,
          false
        );
        const fssUpload = {
          ...successfulFSSUpload,
          status,
          serviceFields: {},
        };

        // Act
        const action = receiveFSSJobCompletionUpdate(fssUpload);
        store.dispatch(action);
        await logicMiddleware.whenComplete();

        // Assert
        expect(actions.includesType(RECEIVE_FSS_JOB_COMPLETION_UPDATE)).to.be
          .false;
      });
    });

    it("retries uploads FSS signals require retrying", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore(
        stateWithMatchingUpload,
        undefined,
        undefined,
        false
      );
      const fssUpload = {
        ...successfulFSSUpload,
        status: JSSJobStatus.WORKING,
        currentStage: UploadStatus.RETRY,
        serviceFields: {},
      };

      // Act
      const action = receiveFSSJobCompletionUpdate(fssUpload);
      store.dispatch(action);
      await logicMiddleware.whenComplete();

      // Assert
      expect(actions.includesType(SET_ALERT)).to.be.true;
    });
  });
});

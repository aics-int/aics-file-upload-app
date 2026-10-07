import { expect } from "chai";
import { createSandbox, createStubInstance, SinonStubbedInstance } from "sinon";

import { FileManagementSystem } from "../../../services";
import {
  JSSJobStatus,
  UploadJob,
} from "../../../services/job-status-service/types";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  mockFailedUploadJob,
  mockState,
  mockSuccessfulUploadJob,
  mockWorkingUploadJob,
} from "../../test/mocks";
import { State } from "../../types";
import { uploadFailed, uploadSucceeded } from "../../upload/actions";
import { receiveJobs, receiveJobUpdate } from "../actions";
import { completeUploadsLogic } from "../logics";

describe("Job logics", () => {
  const sandbox = createSandbox();
  let fms: SinonStubbedInstance<FileManagementSystem>;

  beforeEach(() => {
    fms = createStubInstance(FileManagementSystem);
    sandbox.replace(mockReduxLogicDeps, "fms", fms);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("completeUploadsLogic", () => {
    const storedUpload: UploadJob = {
      ...mockWorkingUploadJob,
      status: JSSJobStatus.SUCCEEDED,
      serviceFields: {
        fileId: "file_id",
        uploadRequest: { files: [], type: "upload" },
      },
    };

    it("completes uploads the storage service has stored", async () => {
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        undefined,
        [completeUploadsLogic]
      );

      store.dispatch(
        receiveJobs([storedUpload, mockWorkingUploadJob, mockFailedUploadJob])
      );
      await logicMiddleware.whenComplete();

      expect(fms.complete).to.have.been.calledOnceWith(storedUpload);
    });

    it("skips uploads whose metadata write already succeeded or failed", async () => {
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        undefined,
        [completeUploadsLogic]
      );
      const failedMetadataWrite: UploadJob = {
        ...storedUpload,
        serviceFields: {
          ...storedUpload.serviceFields,
          uploadRequest: {
            files: [],
            type: "upload",
            metadataWritten: false,
          },
        },
      };

      store.dispatch(
        receiveJobs([mockSuccessfulUploadJob, failedMetadataWrite])
      );
      await logicMiddleware.whenComplete();

      expect(fms.complete).to.not.have.been.called;
    });

    it("completes an upload only once if multiple updates arrive", async () => {
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        undefined,
        [completeUploadsLogic]
      );

      store.dispatch(receiveJobUpdate(storedUpload));
      store.dispatch(receiveJobUpdate(storedUpload));
      await logicMiddleware.whenComplete();

      expect(fms.complete).to.have.been.calledOnce;
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
        id: mockWorkingUploadJob.id,
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
        id: mockWorkingUploadJob.id,
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
        id: mockWorkingUploadJob.id,
        jobName: "someJobName",
        serviceFields: {
          uploadRequest: {
            ...mockFailedUploadJob.serviceFields.uploadRequest,
            files: [],
            type: "upload",
            error: "foo",
          },
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
});

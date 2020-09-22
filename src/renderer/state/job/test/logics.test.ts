import { expect } from "chai";
import {
  createSandbox,
  createStubInstance,
  SinonStubbedInstance,
  stub,
} from "sinon";

import { INCOMPLETE_JOB_IDS_KEY } from "../../../../shared/constants";
import { FileManagementSystem } from "../../../services/aicsfiles";
import { mockJob } from "../../../services/aicsfiles/test/mocks";
import JobStatusClient from "../../../services/job-status-client";
import { JSSJob } from "../../../services/job-status-client/types";
import { LocalStorage } from "../../../types";
import {
  setErrorAlert,
  setInfoAlert,
  setSuccessAlert,
} from "../../feedback/actions";
import { SET_ALERT } from "../../feedback/constants";
import {
  createMockReduxStore,
  dialog,
  fms,
  logger,
  mockReduxLogicDeps,
  ReduxLogicDependencies,
} from "../../test/configure-mock-store";
import {
  mockState,
  mockSuccessfulAddMetadataJob,
  mockSuccessfulUploadJob,
  mockWaitingUploadJob,
} from "../../test/mocks";
import { AlertType } from "../../types";
import {
  cancelUpload,
  cancelUploadFailed,
  cancelUploadSucceeded,
} from "../../upload/actions";
import { CANCEL_UPLOAD } from "../../upload/constants";
import { cancelUploadLogic } from "../../upload/logics";
import { getActionFromBatch } from "../../util";
import {
  handleAbandonedJobs,
  retrieveJobsFailed,
  startJobPoll,
} from "../actions";
import { RECEIVE_JOBS } from "../constants";
import { mapJobsToActions, handleAbandonedJobsLogic } from "../logics";

describe("Job logics", () => {
  const sandbox = createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe("mapJobsToActions", () => {
    const addMetadataJobs = [mockSuccessfulAddMetadataJob];
    const uploadJobs = [mockSuccessfulUploadJob];
    const recentlyFailedJobNames = ["jobName"];
    const recentlySucceededJobNames = ["jobName2"];
    const storage = ({
      clear: stub(),
      delete: stub(),
      get: stub().returns(["abc"]),
      has: stub(),
      reset: stub(),
      set: stub(),
    } as any) as LocalStorage;

    it("Returns retrieveJobsFailed if error is present", () => {
      const action = mapJobsToActions(
        storage,
        logger
      )({ error: new Error("boo") });
      expect(action).to.deep.equal(
        retrieveJobsFailed("Could not retrieve jobs: boo")
      );
    });

    it("Sets jobs passed in", () => {
      const actualIncompleteJobIds = ["imActuallyIncomplete"];
      const actions = mapJobsToActions(
        storage,
        logger
      )({
        actualIncompleteJobIds,
        addMetadataJobs,
        recentlyFailedJobNames,
        recentlySucceededJobNames,
        uploadJobs,
      });
      const receiveJobsAction = getActionFromBatch(actions, RECEIVE_JOBS);

      expect(receiveJobsAction).to.deep.equal({
        payload: {
          addMetadataJobs,
          incompleteJobIds: actualIncompleteJobIds,
          uploadJobs,
        },
        type: RECEIVE_JOBS,
      });
    });

    it("Sends alert for successful upload job given incomplete job", () => {
      const actions = mapJobsToActions(
        storage,
        logger
      )({
        actualIncompleteJobIds: [],
        addMetadataJobs,
        recentlySucceededJobNames: ["mockJob1"],
        uploadJobs,
      });

      const receivedJobsAction = getActionFromBatch(actions, RECEIVE_JOBS);
      expect(receivedJobsAction).to.not.be.undefined;
      expect(receivedJobsAction?.payload.incompleteJobIds).to.be.empty;

      const setAlertAction = getActionFromBatch(actions, SET_ALERT);
      expect(setAlertAction).to.not.be.undefined;
      expect(actions.updates).to.not.be.undefined;
      expect(actions?.updates[INCOMPLETE_JOB_IDS_KEY]).to.deep.equal([]);
      if (setAlertAction) {
        expect(setAlertAction.payload.type).to.equal(AlertType.SUCCESS);
        expect(setAlertAction.payload.message).to.equal("mockJob1 Succeeded");
      }
    });

    it("Sends alert for failed upload job given incomplete job", () => {
      const setStub = stub();
      sandbox.replace(storage, "set", setStub);
      const actions = mapJobsToActions(
        storage,
        logger
      )({
        actualIncompleteJobIds: [],
        addMetadataJobs,
        recentlyFailedJobNames: ["mockFailedUploadJob"],
        uploadJobs,
      });

      const receiveJobsAction = getActionFromBatch(actions, RECEIVE_JOBS);
      expect(receiveJobsAction).to.not.be.undefined;
      expect(receiveJobsAction?.payload.incompleteJobIds).to.be.empty;

      const setAlertAction = getActionFromBatch(actions, SET_ALERT);
      expect(setAlertAction).to.not.be.undefined;
      expect(setStub.calledWith(INCOMPLETE_JOB_IDS_KEY, [])).to.be.true;
      if (setAlertAction) {
        expect(setAlertAction.payload.type).to.equal(AlertType.ERROR);
        expect(setAlertAction.payload.message).to.equal(
          "mockFailedUploadJob Failed"
        );
      }
    });
  });

  describe("handleAbandonedJobsLogic", () => {
    let jssStub: SinonStubbedInstance<JobStatusClient>;
    let fmsStub: SinonStubbedInstance<FileManagementSystem>;
    let logicDeps: ReduxLogicDependencies;

    beforeEach(() => {
      jssStub = createStubInstance(JobStatusClient);
      fmsStub = createStubInstance(FileManagementSystem);

      logicDeps = {
        ...mockReduxLogicDeps,
        // Assert that the stubs are of the correct types
        jssClient: (jssStub as unknown) as JobStatusClient,
        fms: (fmsStub as unknown) as FileManagementSystem,
      };
    });

    it("does not find any abandoned jobs", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      jssStub.getJobs.onFirstCall().resolves([]);

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([handleAbandonedJobs()]);
      expect(jssStub.getJobs).to.have.been.calledOnce;
    });

    it("finds and retries one abandoned job with no children", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      const abandonedJob: JSSJob = {
        ...mockWaitingUploadJob,
        jobId: "abandoned_job_id",
        jobName: "abandoned_job",
        serviceFields: {
          files: [{ file: { originalPath: "test_path" } }],
        },
      };

      jssStub.getJobs
        .onFirstCall()
        .resolves([abandonedJob])
        .onSecondCall()
        .resolves([]);

      fmsStub.failUpload.onFirstCall().resolves([abandonedJob]);
      fmsStub.retryUpload.resolves();

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        handleAbandonedJobs(),
        startJobPoll(),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
        setSuccessAlert('Retry for upload "abandoned_job" succeeded!'),
      ]);
    });

    it("finds and retries one abandoned job with children", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      const abandonedJob: JSSJob = {
        ...mockWaitingUploadJob,
        jobId: "abandoned_job_id",
        jobName: "abandoned_job",
        childIds: ["child_job_id"],
        serviceFields: {
          files: [{ file: { originalPath: "test_path" } }],
        },
      };
      const childJob: JSSJob = {
        ...mockWaitingUploadJob,
        jobId: "child_job_id",
        jobName: "child_job",
        parentId: "abandoned_job_id",
      };

      jssStub.getJobs
        .onFirstCall()
        .resolves([abandonedJob])
        .onSecondCall()
        .resolves([childJob]);

      fmsStub.failUpload.onFirstCall().resolves([abandonedJob]);

      fmsStub.retryUpload.resolves();

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        handleAbandonedJobs(),
        startJobPoll(),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
        setSuccessAlert('Retry for upload "abandoned_job" succeeded!'),
      ]);
    });

    it("encounters an error while querying", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      jssStub.getJobs.onFirstCall().rejects(new Error("Error while querying"));

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        handleAbandonedJobs(),
        setErrorAlert("Could not retry abandoned jobs: Error while querying"),
      ]);
      expect(jssStub.getJobs).to.have.been.calledOnce;
    });

    it("dispatches setErrorAlert if fms.retryUpload fails", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(mockState, logicDeps, [
        handleAbandonedJobsLogic,
      ]);

      const abandonedJob: JSSJob = {
        ...mockWaitingUploadJob,
        jobId: "abandoned_job_id",
        jobName: "abandoned_job",
        serviceFields: {
          files: [{ file: { originalPath: "test_path" } }],
        },
      };

      jssStub.getJobs
        .onFirstCall()
        .resolves([abandonedJob])
        .onSecondCall()
        .resolves([]);

      fmsStub.failUpload.onFirstCall().resolves([abandonedJob]);
      fmsStub.retryUpload.rejects(new Error("Error in worker"));

      store.dispatch(handleAbandonedJobs());

      await logicMiddleware.whenComplete();
      expect(actions.list).to.deep.equal([
        handleAbandonedJobs(),
        startJobPoll(),
        setInfoAlert(
          'Upload "abandoned_job" was abandoned and will now be retried.'
        ),
        setErrorAlert(
          'Retry for upload "abandoned_job" failed: Error in worker'
        ),
      ]);
    });
  });
  describe("cancelUpload", () => {
    it("sets alert if job is not defined", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(undefined, undefined, [cancelUploadLogic]);
      store.dispatch({
        payload: {},
        type: CANCEL_UPLOAD,
      });
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          setErrorAlert("Cannot cancel undefined upload job")
        )
      ).to.be.true;
    });
    it("shows dialog and allows user to cancel if they change their mind", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(undefined, undefined, [cancelUploadLogic]);
      dialog.showMessageBox = stub().resolves({ response: 0 }); // cancel button
      fms.failUpload = stub().resolves();

      store.dispatch(cancelUpload({ ...mockJob, key: "key" }, []));
      await logicMiddleware.whenComplete();

      expect(dialog.showMessageBox.called).to.be.true;
      expect(actions.list).to.deep.equal([{ type: "ignore" }]);
    });
    it("shows dialog and allows user to continue and dispatches cancelUploadSucceeded if cancelling the upload succeeded", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(undefined, undefined, [cancelUploadLogic]);
      dialog.showMessageBox = stub().resolves({ response: 1 }); // Yes button index
      const job = { ...mockJob, key: "key" };

      store.dispatch(cancelUpload(job, []));
      await logicMiddleware.whenComplete();

      expect(dialog.showMessageBox.called).to.be.true;
      expect(actions.includesMatch(cancelUpload(job, []))).to.be.true;
      expect(actions.includesMatch(cancelUploadSucceeded(job))).to.be.true;
    });
    it("dispatches cancelUploadFailed if cancelling the upload failed", async () => {
      const {
        actions,
        logicMiddleware,
        store,
      } = createMockReduxStore(undefined, undefined, [cancelUploadLogic]);
      dialog.showMessageBox = stub().resolves({ response: 1 }); // Yes button index
      const job = { ...mockJob, key: "key" };
      sandbox.replace(fms, "failUpload", stub().rejects(new Error("foo")));

      store.dispatch(cancelUpload(job, []));
      await logicMiddleware.whenComplete();

      expect(dialog.showMessageBox.called).to.be.true;
      expect(actions.includesMatch(cancelUpload(job, []))).to.be.true;
      expect(
        actions.includesMatch(
          cancelUploadFailed(job, `Cancel upload ${job.jobName} failed: foo`)
        )
      ).to.be.true;
    });
  });
});

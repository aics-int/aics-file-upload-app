import { expect } from "chai";
import { createSandbox, createStubInstance, SinonStubbedInstance } from "sinon";

import MetadataExtractionService, {
  MXSResult,
} from "../../../services/metadata-extraction-service";
import { SET_APPLIED_TEMPLATE } from "../../template/constants";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import { mockState } from "../../test/mocks";
import { AUTOFILL_FROM_MXS } from "../../upload/constants";
import { fetchMetadataRequest } from "../actions";
import {
  FETCH_METADATA_REQUEST,
  FETCH_METADATA_SUCCEEDED,
  FETCH_METADATA_FAILED,
} from "../constants";
import logics from "../logics";

describe("metadataExtraction logics", () => {
  const sandbox = createSandbox();
  let mxsClient: SinonStubbedInstance<MetadataExtractionService>;

  beforeEach(() => {
    mxsClient = createStubInstance(MetadataExtractionService);
    sandbox.replace(mockReduxLogicDeps, "mxsClient", mxsClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("fetchMetadataLogic", () => {
    it("dispatches FETCH_METADATA_SUCCEEDED and AUTOFILL_FROM_MXS on success", async () => {
      const filePath = "/path/to/file.czi";
      const mxsResult: MXSResult = {
        "Imaged By": { annotation_id: 108, value: "test_user" },
        Timelapse: { annotation_id: 50, value: false },
      };

      mxsClient.fetchExtractedMetadata.resolves(mxsResult);

      const { store, logicMiddleware, actions } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps,
        logics
      );

      store.dispatch(fetchMetadataRequest(filePath));
      await logicMiddleware.whenComplete();

      expect(actions.includesType(FETCH_METADATA_REQUEST)).to.be.true;
      expect(actions.includesType(FETCH_METADATA_SUCCEEDED)).to.be.true;
      expect(actions.includesType(AUTOFILL_FROM_MXS)).to.be.true;

      const succeededAction = actions.list.find(
        (a) => a.type === FETCH_METADATA_SUCCEEDED
      );
      expect(succeededAction?.payload.filePath).to.equal(filePath);
      expect(succeededAction?.payload.metadata).to.deep.equal(mxsResult);

      const autofillAction = actions.list.find(
        (a) => a.type === AUTOFILL_FROM_MXS
      );
      expect(autofillAction?.payload.filePath).to.equal(filePath);
      expect(autofillAction?.payload.mxsResult).to.deep.equal(mxsResult);
    });

    it("dispatches FETCH_METADATA_FAILED on error", async () => {
      const filePath = "/path/to/file.czi";
      const error = new Error("Network error");

      mxsClient.fetchExtractedMetadata.rejects(error);

      const { store, logicMiddleware, actions } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps,
        logics
      );

      store.dispatch(fetchMetadataRequest(filePath));
      await logicMiddleware.whenComplete();

      expect(actions.includesType(FETCH_METADATA_REQUEST)).to.be.true;
      expect(actions.includesType(FETCH_METADATA_FAILED)).to.be.true;
      expect(actions.includesType(FETCH_METADATA_SUCCEEDED)).to.be.false;
      expect(actions.includesType(AUTOFILL_FROM_MXS)).to.be.false;

      const failedAction = actions.list.find(
        (a) => a.type === FETCH_METADATA_FAILED
      );
      expect(failedAction?.payload.filePath).to.equal(filePath);
    });
  });

  describe("autoFetchMetadataOnTemplateAppliedLogic", () => {
    it("dispatches FETCH_METADATA_REQUEST for each file when template is applied", async () => {
      const uploads = {
        "/path/to/file1.czi": { file: "/path/to/file1.czi" },
        "/path/to/file2.czi": { file: "/path/to/file2.czi" },
      };

      mxsClient.fetchExtractedMetadata.resolves({});

      const { store, logicMiddleware, actions } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps,
        logics
      );

      store.dispatch({
        type: SET_APPLIED_TEMPLATE,
        autoSave: true,
        payload: {
          template: {
            templateId: 1,
            name: "Test",
            annotations: [],
            version: 1,
            created: new Date(),
            createdBy: 1,
            modified: new Date(),
            modifiedBy: 1,
          },
          uploads,
        },
      });

      await logicMiddleware.whenComplete();

      const fetchRequests = actions.list.filter(
        (a) => a.type === FETCH_METADATA_REQUEST
      );

      expect(fetchRequests).to.have.length(2);
      const filePaths = fetchRequests.map((a) => a.payload.filePath);
      expect(filePaths).to.include("/path/to/file1.czi");
      expect(filePaths).to.include("/path/to/file2.czi");
    });

    it("does nothing when uploads is empty", async () => {
      const { store, logicMiddleware, actions } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps,
        logics
      );

      store.dispatch({
        type: SET_APPLIED_TEMPLATE,
        autoSave: true,
        payload: {
          template: {
            templateId: 1,
            name: "Test",
            annotations: [],
            version: 1,
            created: new Date(),
            createdBy: 1,
            modified: new Date(),
            modifiedBy: 1,
          },
          uploads: {},
        },
      });

      await logicMiddleware.whenComplete();

      const fetchRequests = actions.list.filter(
        (a) => a.type === FETCH_METADATA_REQUEST
      );

      expect(fetchRequests).to.have.length(0);
    });
  });
});

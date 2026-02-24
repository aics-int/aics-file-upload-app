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
import { mockMMSTemplate, mockState } from "../../test/mocks";
import { State } from "../../types";
import { AUTOFILL_FROM_MXS, ADD_UPLOAD_FILES } from "../../upload/constants";
import { fetchMetadataRequest, fetchMetadataSucceeded } from "../actions";
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
    it("dispatches FETCH_METADATA_SUCCEEDED on success (without AUTOFILL_FROM_MXS)", async () => {
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
      expect(actions.includesType(AUTOFILL_FROM_MXS)).to.be.false;

      const succeededAction = actions.list.find(
        (a) => a.type === FETCH_METADATA_SUCCEEDED
      );
      expect(succeededAction?.payload.filePath).to.equal(filePath);
      expect(succeededAction?.payload.metadata).to.deep.equal(mxsResult);
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

      const failedAction = actions.list.find(
        (a) => a.type === FETCH_METADATA_FAILED
      );
      expect(failedAction?.payload.filePath).to.equal(filePath);
    });
  });

  describe("autoFetchMetadataOnAddFilesLogic", () => {
    it("dispatches FETCH_METADATA_REQUEST for each file when files are added", async () => {
      const files = [
        { file: "/path/to/file1.czi" },
        { file: "/path/to/file2.czi" },
      ];

      mxsClient.fetchExtractedMetadata.resolves({});

      const { store, logicMiddleware, actions } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps,
        logics
      );

      store.dispatch({
        type: ADD_UPLOAD_FILES,
        autoSave: true,
        payload: files,
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

    it("does nothing when no files are added", async () => {
      const { store, logicMiddleware, actions } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps,
        logics
      );

      store.dispatch({
        type: ADD_UPLOAD_FILES,
        autoSave: true,
        payload: [],
      });

      await logicMiddleware.whenComplete();

      const fetchRequests = actions.list.filter(
        (a) => a.type === FETCH_METADATA_REQUEST
      );

      expect(fetchRequests).to.have.length(0);
    });
  });

  describe("autofillOnTemplateAppliedLogic", () => {
    it("dispatches AUTOFILL_FROM_MXS for files with cached metadata when template is selected", async () => {
      const filePath = "/path/to/file.czi";
      const cachedMetadata: MXSResult = {
        "Imaged By": { annotation_id: 108, value: "test_user" },
      };

      const stateWithCachedMetadata: State = {
        ...mockState,
        metadataExtraction: {
          [filePath]: {
            loading: false,
            metadata: cachedMetadata,
            error: undefined,
          },
        },
      };

      const { store, logicMiddleware, actions } = createMockReduxStore(
        stateWithCachedMetadata,
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
          uploads: {
            [filePath]: { file: filePath },
          },
        },
      });

      await logicMiddleware.whenComplete();

      expect(actions.includesType(AUTOFILL_FROM_MXS)).to.be.true;

      const autofillAction = actions.list.find(
        (a) => a.type === AUTOFILL_FROM_MXS
      );
      expect(autofillAction?.payload.filePath).to.equal(filePath);
      expect(autofillAction?.payload.mxsResult).to.deep.equal(cachedMetadata);
    });

    it("does not dispatch AUTOFILL_FROM_MXS for files without cached metadata", async () => {
      const filePath = "/path/to/file.czi";

      // no cached metadata
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
          uploads: {
            [filePath]: { file: filePath },
          },
        },
      });

      await logicMiddleware.whenComplete();

      expect(actions.includesType(AUTOFILL_FROM_MXS)).to.be.false;
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

      expect(actions.includesType(AUTOFILL_FROM_MXS)).to.be.false;
    });

    it("only autofills files with cached metadata", async () => {
      const fileWithMetadata = "/path/to/file1.czi";
      const fileWithoutMetadata = "/path/to/file2.czi";
      const cachedMetadata: MXSResult = {
        "Imaged By": { annotation_id: 108, value: "test_user" },
      };

      // cached metadata for only one file
      const stateWithPartialCache: State = {
        ...mockState,
        metadataExtraction: {
          [fileWithMetadata]: {
            loading: false,
            metadata: cachedMetadata,
            error: undefined,
          },
        },
      };

      const { store, logicMiddleware, actions } = createMockReduxStore(
        stateWithPartialCache,
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
          uploads: {
            [fileWithMetadata]: { file: fileWithMetadata },
            [fileWithoutMetadata]: { file: fileWithoutMetadata },
          },
        },
      });

      await logicMiddleware.whenComplete();

      const autofillActions = actions.list.filter(
        (a) => a.type === AUTOFILL_FROM_MXS
      );

      expect(autofillActions).to.have.length(1);
      expect(autofillActions[0].payload.filePath).to.equal(fileWithMetadata);
    });
  });

  describe("autofillOnMetadataArrivedLogic", () => {
    it("dispatches AUTOFILL_FROM_MXS when metadata arrives and a template is already applied and the file is in upload.present", async () => {
      const filePath = "/path/to/file.czi";
      const metadata: MXSResult = {
        "Imaged By": { annotation_id: 108, value: "test_user" },
      };

      const stateWithTemplateAndUpload: State = {
        ...mockState,
        template: { ...mockState.template, appliedTemplate: mockMMSTemplate },
        upload: {
          ...mockState.upload,
          present: { [filePath]: { file: filePath } },
        },
      };

      const { store, logicMiddleware, actions } = createMockReduxStore(
        stateWithTemplateAndUpload,
        mockReduxLogicDeps,
        logics
      );

      store.dispatch(fetchMetadataSucceeded(filePath, metadata));
      await logicMiddleware.whenComplete();

      expect(actions.includesType(AUTOFILL_FROM_MXS)).to.be.true;

      const autofillAction = actions.list.find(
        (a) => a.type === AUTOFILL_FROM_MXS
      );
      expect(autofillAction?.payload.filePath).to.equal(filePath);
      expect(autofillAction?.payload.mxsResult).to.deep.equal(metadata);
    });

    it("does not dispatch AUTOFILL_FROM_MXS when metadata arrives but the file is not in upload.present", async () => {
      const filePath = "/path/to/file.czi";
      const metadata: MXSResult = {
        "Imaged By": { annotation_id: 108, value: "test_user" },
      };

      // Template is applied but the file is NOT in upload.present
      const stateWithTemplateOnly: State = {
        ...mockState,
        template: { ...mockState.template, appliedTemplate: mockMMSTemplate },
        upload: {
          ...mockState.upload,
          present: {},
        },
      };

      const { store, logicMiddleware, actions } = createMockReduxStore(
        stateWithTemplateOnly,
        mockReduxLogicDeps,
        logics
      );

      store.dispatch(fetchMetadataSucceeded(filePath, metadata));
      await logicMiddleware.whenComplete();

      expect(actions.includesType(AUTOFILL_FROM_MXS)).to.be.false;
    });

    it("does not dispatch AUTOFILL_FROM_MXS when metadata arrives and no template is applied", async () => {
      const filePath = "/path/to/file.czi";
      const metadata: MXSResult = {
        "Imaged By": { annotation_id: 108, value: "test_user" },
      };

      // No template applied, file IS in upload.present
      const stateWithUploadOnly: State = {
        ...mockState,
        upload: {
          ...mockState.upload,
          present: { [filePath]: { file: filePath } },
        },
      };

      const { store, logicMiddleware, actions } = createMockReduxStore(
        stateWithUploadOnly,
        mockReduxLogicDeps,
        logics
      );

      store.dispatch(fetchMetadataSucceeded(filePath, metadata));
      await logicMiddleware.whenComplete();

      expect(actions.includesType(AUTOFILL_FROM_MXS)).to.be.false;
    });
  });
});

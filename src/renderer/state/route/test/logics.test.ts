import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import {
  createSandbox,
  SinonStubbedInstance,
  stub,
  createStubInstance,
} from "sinon";

import FileManagementSystem from "../../../services/file-management-system";
import JobStatusService from "../../../services/job-status-service";
import { JSSJobStatus } from "../../../services/job-status-service/types";
import LabkeyClient from "../../../services/labkey-client";
import MetadataManagementService from "../../../services/metadata-management-service";
import { requestFailed } from "../../actions";
import { REQUEST_FAILED } from "../../constants";
import { getAlert } from "../../feedback/selectors";
import { SET_PLATE_BARCODE_TO_PLATES } from "../../metadata/constants";
import { getPlateBarcodeToPlates } from "../../metadata/selectors";
import { getAppliedTemplate } from "../../template/selectors";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockAnnotationOptions,
  mockAnnotations,
  mockAnnotationTypes,
  mockAuditInfo,
  mockFailedUploadJob,
  mockFavoriteColorAnnotation,
  mockMMSTemplate,
  mockState,
  mockSuccessfulUploadJob,
  mockWellAnnotation,
  mockWellUpload,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { AlertType, AsyncRequest, Page, State } from "../../types";
import { getUploadRowKey } from "../../upload/constants";
import { getUpload } from "../../upload/selectors";
import { closeUpload, viewUploads } from "../actions";
import { VIEW_UPLOADS_SUCCEEDED } from "../constants";
import { getPage, getView } from "../selectors";

describe("Route logics", () => {
  const sandbox = createSandbox();
  let mmsClient: SinonStubbedInstance<MetadataManagementService>;
  let labkeyClient: SinonStubbedInstance<LabkeyClient>;
  let fms: SinonStubbedInstance<FileManagementSystem>;
  let jssClient: SinonStubbedInstance<JobStatusService>;
  const testDir = path.resolve(os.tmpdir(), "routeTest");

  before(async () => {
    await fs.promises.mkdir(testDir);
  })

  beforeEach(() => {
    mmsClient = createStubInstance(MetadataManagementService);
    labkeyClient = createStubInstance(LabkeyClient);
    fms = createStubInstance(FileManagementSystem);
    jssClient = createStubInstance(JobStatusService);
    sandbox.replace(mockReduxLogicDeps, "mmsClient", mmsClient);
    sandbox.replace(mockReduxLogicDeps, "labkeyClient", labkeyClient);
    sandbox.replace(mockReduxLogicDeps, "fms", fms);
    sandbox.replace(mockReduxLogicDeps, "jssClient", jssClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  after(async () => {
    await fs.promises.rm(testDir, { recursive: true });
  })

  describe("resetUploadLogic", () => {
    it("goes to MyUploads page given user clicks Save Upload Draft from dialog", async () => {
      // Arrange
      const mockDeps = {
        ...mockReduxLogicDeps,
      }
      mockDeps.ipcRenderer.invoke.resolves(1)
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        route: {
          page: Page.UploadWithTemplate,
          view: Page.UploadWithTemplate,
        },
        upload: getMockStateWithHistory(mockWellUpload),
      }, mockDeps);
  
      // (sanity-check)
      expect(getPage(store.getState())).to.equal(Page.UploadWithTemplate);
      expect(getView(store.getState())).to.equal(Page.UploadWithTemplate);
      expect(mockDeps.ipcRenderer.invoke).to.not.have.been.calledOnce;
  
      // Act
      store.dispatch(closeUpload());
      await logicMiddleware.whenComplete();

      // Assert
      expect(getPage(store.getState())).to.equal(Page.MyUploads);
      expect(getView(store.getState())).to.equal(Page.MyUploads);
      expect(mockDeps.ipcRenderer.invoke).to.have.been.calledOnce;
    });

    it("stays on current page given 'Cancel' clicked from dialog", async () => {
      // Arrange
      const ipcRenderer = {
        invoke: stub(),
        on: stub(),
        send: stub(),
      }
      const mockDeps = {
        ...mockReduxLogicDeps,
        ipcRenderer
      }
      mockDeps.ipcRenderer.invoke.resolves(0)
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        route: {
          page: Page.UploadWithTemplate,
          view: Page.UploadWithTemplate,
        },
        upload: getMockStateWithHistory(mockWellUpload),
      }, mockDeps);
  
      // (sanity-check)
      expect(getPage(store.getState())).to.equal(Page.UploadWithTemplate);
      expect(getView(store.getState())).to.equal(Page.UploadWithTemplate);
      expect(mockDeps.ipcRenderer.invoke).to.not.have.been.calledOnce;
  
      // Act
      store.dispatch(closeUpload());
      await logicMiddleware.whenComplete();

      // Assert
      expect(getPage(store.getState())).to.equal(Page.UploadWithTemplate);
      expect(getView(store.getState())).to.equal(Page.UploadWithTemplate);
      expect(mockDeps.ipcRenderer.invoke).to.have.been.calledOnce;
    });
  });
  describe("viewUploadsLogic", () => {
    const fileMetadata = {
      fileId: "abcdefg",
      filename: "name",
      fileSize: 1,
      fileType: "image",
      localFilePath: "/localFilePath",
      modified: "",
      modifiedBy: "foo",
    };

    const stubMethods = (messageBoxButtonIndex?: number, filePath?: string) => {
      const ipcRenderer = {
        invoke: stub(),
        on: stub(),
        send: stub(),
      }
      const mockDeps = {
        ...mockReduxLogicDeps,
        ipcRenderer
      }
      ipcRenderer.invoke.onCall(0).resolves(messageBoxButtonIndex)
      ipcRenderer.invoke.onCall(1).resolves(filePath)
      labkeyClient.selectFirst.resolves(fileMetadata);
      mmsClient.getFileMetadata.resolves({
        ...fileMetadata,
        templateId: 1,
        annotations: [
          {
            annotationId: mockFavoriteColorAnnotation.annotationId,
            values: ["Blue", "Green"],
          },
          {
            annotationId: mockWellAnnotation.annotationId,
            values: ["A1", "B6"],
          },
        ],
      });
      labkeyClient.findPlateByWellId.resolves({
        BarCode: "abc",
        ImagingSessionId: 6,
      });
      labkeyClient.findImagingSessionsByPlateBarcode.resolves([
        { ImagingSessionId: 4, "ImagingSessionId/Name": "3 hours" },
      ]);
      mmsClient.getPlate.resolves({
        plate: {
          ...mockAuditInfo,
          barcode: "123456",
          comments: "",
          imagingSessionId: undefined,
          plateGeometryId: 1,
          plateId: 1,
          plateStatusId: 1,
          seededOn: "2018-02-14 23:03:52",
        },
        wells: [],
      });
      mmsClient.getTemplate.resolves(mockMMSTemplate);
      return mockDeps;
    };

    let mockStateWithMetadata: State;
    beforeEach(() => {
      mockStateWithMetadata = {
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationOptions: mockAnnotationOptions,
          annotationTypes: mockAnnotationTypes,
          annotations: mockAnnotations,
        },
        route: {
          ...mockState.route,
          page: Page.MyUploads,
          view: Page.MyUploads,
        },
        selection: {
          ...mockState.selection,
        },
        upload: getMockStateWithHistory({}),
      };
    });

    it("doesn't do anything if user cancels action when asked to save current draft", async () => {
      const mockDeps = stubMethods(0);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload, mockDeps
      );

      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      const actionTypes = actions.list.map((a) => a.type);
      expect(actionTypes).to.include("ignore");
      expect(actionTypes).not.to.include(VIEW_UPLOADS_SUCCEEDED);
      expect(actionTypes).not.to.include(REQUEST_FAILED);
    });

    it("shows save dialog if user has another draft open", async () => {
      const mockDeps = stubMethods(2, path.resolve(testDir, "savedDraft"));
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload, mockDeps
      );

      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      expect(mockDeps.ipcRenderer.invoke).to.have.been.calledTwice;
    });

    it("shows save dialog if user is editing another upload", async () => {
      const mockDeps = stubMethods(2, path.resolve(testDir, "savedEdit"));
      const { logicMiddleware, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: {
          ...nonEmptyStateForInitiatingUpload.selection,
        },
      }, mockDeps);

      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      expect(mockDeps.ipcRenderer.invoke).to.have.been.calledTwice;
    });

    it("sets error alert if job passed is missing information", async () => {
      // Arrange
      const mockDeps = stubMethods(1);
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload, mockDeps
      );

      // Act
      store.dispatch(
        viewUploads([
          {
            ...mockSuccessfulUploadJob,
            status: JSSJobStatus.FAILED,
          },
        ])
      );
      await logicMiddleware.whenComplete();

      // Assert
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      expect(alert?.type).to.equal(AlertType.ERROR);
      expect(alert?.message).to.equal(
        `Upload ${mockSuccessfulUploadJob.jobName} has missing information`
      );
    });

    it("sets error alert if something fails while showing the warning dialog", async () => {
      // Arrange
      const mockDeps = stubMethods();
      const errorMessage = "expected failure";
      mockDeps.ipcRenderer.invoke.onCall(0).rejects(new Error(errorMessage));
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload, mockDeps
      );

      // (sanity-check) ensure alert not already present in state
      expect(getAlert(store.getState())).to.be.undefined;

      // Act
      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      // Assert
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      expect(alert?.type).to.equal(AlertType.ERROR);
      expect(alert?.message).to.equal(errorMessage);
    });

    it("allows users to open a failed upload", async () => {
      // Arrange
      const mockDeps = stubMethods();
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata, mockDeps
      );

      // Act
      store.dispatch(viewUploads([mockFailedUploadJob]));
      await logicMiddleware.whenComplete();

      // Assert
      expect(actions.list.map(({ type }) => type)).includes(
        VIEW_UPLOADS_SUCCEEDED
      );
    });

    it("handles case where upload page is not open yet", async () => {
      // Arrange
      const mockDeps = stubMethods();
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata, mockDeps
      );

      // (sanity-check) pre-check values in state
      let state = store.getState();
      expect(getPage(state)).to.equal(Page.MyUploads);
      expect(getView(state)).to.equal(Page.MyUploads);
      expect(getUpload(state)).to.be.empty;
      expect(getAppliedTemplate(state)).to.be.undefined;

      // Act
      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      // Assert
      state = store.getState();
      expect(getPage(state)).to.equal(Page.UploadWithTemplate);
      expect(getView(state)).to.equal(Page.UploadWithTemplate);
      expect(getUpload(state)).to.deep.equal({
        [getUploadRowKey({ file: fileMetadata.localFilePath || "" })]: {
          file: fileMetadata.localFilePath,
          fileId: fileMetadata.fileId,
          "Favorite Color": ["Blue", "Green"],
          channelId: undefined,
          fovId: undefined,
          positionIndex: undefined,
          scene: undefined,
          subImageName: undefined,
        },
      });
      expect(getAppliedTemplate(state)).to.not.be.undefined;
    });
  
    it("dispatches requestFailed if boolean annotation type id is not defined", async () => {
      const mockDeps = stubMethods();
      mmsClient.getFileMetadata.resolves({
        ...fileMetadata,
        templateId: 1,
        annotations: [],
      });
      const { actions, logicMiddleware, store } = createMockReduxStore(mockState, mockDeps);

      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          requestFailed(
            `Could not open upload editor: Boolean annotation type id not found. Contact Software.`,
            AsyncRequest.GET_FILE_METADATA_FOR_JOB
          )
        )
      ).to.be.true;
    });
    it("dispatches requestFailed given not OK response when getting file metadata", async () => {
      const errorMessage = "lk failure";
      labkeyClient.selectFirst.rejects(new Error(errorMessage));
      const { actions, logicMiddleware, store } =
        createMockReduxStore(mockState);

      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          requestFailed(
            `Could not open upload editor: ${errorMessage}`,
            AsyncRequest.GET_FILE_METADATA_FOR_JOB
          )
        )
      ).to.be.true;
    });

    it("does not dispatch setPlateBarcodeToImagingSessions action if file metadata does not contain well annotation", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );

      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      expect(getPlateBarcodeToPlates(store.getState())).to.be.empty;
      expect(
        actions.includesMatch({
          type: SET_PLATE_BARCODE_TO_PLATES,
        })
      );
    });

    it("sets upload error if something goes wrong while trying to get and set plate info", async () => {
      const mockDeps = stubMethods();
      const errorMessage = "foo";
      mmsClient.getPlate.rejects(new Error(errorMessage));
      mmsClient.getFileMetadata.resolves({
        ...fileMetadata,
        templateId: 1,
        annotations: [
          { ...mockFavoriteColorAnnotation, values: ["Blue", "Green"] },
          { ...mockWellAnnotation, values: ["A1", "B6"] },
        ],
      });
      mmsClient.getTemplate.resolves({
        annotations: [{
          annotationId: mockWellAnnotation.annotationId,
          annotationTypeId: 1,
          name: "",
          description: "",
          orderIndex: 1,
          required: true,
          created: new Date(),
          createdBy: 1024,
          modified: new Date(),
          modifiedBy: 1024,
        }],
        name: "testTemplate",
        version: 1,
        templateId: 4,
        created: new Date(),
        createdBy: 1024,
        modified: new Date(),
        modifiedBy: 1024,
      })
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata, mockDeps
      );
      const expectedAction = requestFailed(
        `Could not open upload editor: ${errorMessage}`,
        AsyncRequest.GET_FILE_METADATA_FOR_JOB
      );
      expect(actions.includesMatch(expectedAction)).to.be.false;

      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch(expectedAction)).to.be.true;
    });

    it("dispatches requestFailed if getting template fails", async () => {
      const mockDeps = stubMethods();
      const errorMessage = "foo";
      mmsClient.getTemplate.rejects(new Error(errorMessage));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata, mockDeps
      );
      const expectedAction = requestFailed(
        `Could not open upload editor: ${errorMessage}`,
        AsyncRequest.GET_FILE_METADATA_FOR_JOB
      );
      expect(actions.includesMatch(expectedAction)).to.be.false;

      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch(expectedAction)).to.be.true;
    });
  });
});

import { expect } from "chai";
import { ActionCreator, Store } from "redux";
import {
  createSandbox,
  SinonStub,
  SinonStubbedInstance,
  stub,
  createStubInstance,
} from "sinon";

import { AnnotationName } from "../../../constants";
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
import { Actions } from "../../test/action-tracker";
import {
  createMockReduxStore,
  dialog,
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
import { AlertType, AsyncRequest, Logger, Page, State } from "../../types";
import { getUploadRowKey } from "../../upload/constants";
import { getUpload } from "../../upload/selectors";
import { closeUpload, viewUploads } from "../actions";
import { VIEW_UPLOADS_SUCCEEDED } from "../constants";
import { setSwitchEnvEnabled } from "../logics";
import { getPage, getView } from "../selectors";
import Menu = Electron.Menu;

describe("Route logics", () => {
  const sandbox = createSandbox();
  let mmsClient: SinonStubbedInstance<MetadataManagementService>;
  let labkeyClient: SinonStubbedInstance<LabkeyClient>;
  let fms: SinonStubbedInstance<FileManagementSystem>;
  let jssClient: SinonStubbedInstance<JobStatusService>;

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

  describe("setSwitchEnvEnabled", () => {
    let switchEnv: { enabled: boolean; label: string };
    let fileMenu: {
      label: string;
      submenu: { items: Array<{ enabled: boolean; label: string }> };
    };
    let menu: Menu;
    let logger: Logger;
    const logError: SinonStub = stub();

    beforeEach(() => {
      logger = ({
        error: logError,
      } as any) as Logger;
      switchEnv = {
        enabled: true,
        label: "Switch Environment",
      };
      fileMenu = {
        label: "file",
        submenu: {
          items: [switchEnv],
        },
      };
      menu = ({
        items: [fileMenu],
      } as any) as Menu;
    });

    it("logs error if file menu not found", () => {
      stub(fileMenu, "label").value("Edit");
      setSwitchEnvEnabled(menu, false, logger);
      expect(switchEnv.enabled).to.be.true;
      expect(logError.called).to.be.true;
    });
    it("logs error if file submenu not found", () => {
      stub(fileMenu, "submenu").value(undefined);
      setSwitchEnvEnabled(menu, false, logger);
      expect(switchEnv.enabled).to.be.true;
      expect(logError.called).to.be.true;
    });
    it("logs error if Switch Environment menu option not found", () => {
      stub(fileMenu, "submenu").value({ items: [] });
      setSwitchEnvEnabled(menu, false, logger);
      expect(switchEnv.enabled).to.be.true;
      expect(logError.called).to.be.true;
    });
    it("sets Switch Environment menu option to enabled if enabled=true", () => {
      stub(switchEnv, "enabled").value(false);
      expect(switchEnv.enabled).to.be.false;
      setSwitchEnvEnabled(menu, true, logger);
      expect(switchEnv.enabled).to.be.true;
    });
    it("sets Switch Environment menu option to disabled if enabled=false", () => {
      stub(switchEnv, "enabled").value(true);
      expect(switchEnv.enabled).to.be.true;
      setSwitchEnvEnabled(menu, false, logger);
      expect(switchEnv.enabled).to.be.false;
    });
  });

  /**
   * helper function for go back and closeUpload logic tests
   * @param startPage the page we start on
   * @param expectedEndPage the page we expect to end at,
   * @param action action creator to dispatch
   * @param messageBoxResponse button index to simulate user click
   * changes and go back
   * @param state
   */
  const runShowMessageBoxTest = async (
    startPage: Page,
    expectedEndPage: Page,
    action: ActionCreator<any>,
    messageBoxResponse = 1,
    state: State = mockState
  ): Promise<{
    actions: Actions;
    showMessageBoxStub: SinonStub;
    store: Store;
  }> => {
    const showMessageBoxStub = stub().resolves({
      response: messageBoxResponse,
    });
    sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);
    const { actions, logicMiddleware, store } = createMockReduxStore({
      ...state,
      route: {
        page: startPage,
        view: startPage,
      },
      upload: getMockStateWithHistory(mockWellUpload),
    });

    expect(getPage(store.getState())).to.equal(startPage);
    expect(getView(store.getState())).to.equal(startPage);
    expect(showMessageBoxStub.called).to.be.false;

    store.dispatch(action());

    await logicMiddleware.whenComplete();
    expect(getPage(store.getState())).to.equal(expectedEndPage);
    expect(getView(store.getState())).to.equal(expectedEndPage);
    expect(showMessageBoxStub.called).to.be.true;
    return { actions, showMessageBoxStub, store };
  };

  describe("resetUploadLogic", () => {
    it("goes to MyUploads page given user clicks Save Upload Draft from dialog", async () => {
      const showSaveDialogStub = stub().resolves({
        cancelled: false,
        filePath: "/bar",
      });
      sandbox.replace(dialog, "showSaveDialog", showSaveDialogStub);
      await runShowMessageBoxTest(
        Page.UploadWithTemplate,
        Page.MyUploads,
        closeUpload,
        2
      );
      expect(showSaveDialogStub.called).to.be.true;
    });
    it("stays on current page given 'Cancel' clicked from dialog", async () => {
      await runShowMessageBoxTest(
        Page.UploadWithTemplate,
        Page.UploadWithTemplate,
        closeUpload,
        0
      );
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

    const stubMethods = ({
      showMessageBox,
      showSaveDialog,
      writeFile,
    }: {
      showMessageBox?: SinonStub;
      showSaveDialog?: SinonStub;
      writeFile?: SinonStub;
    }) => {
      sandbox.replace(
        dialog,
        "showMessageBox",
        showMessageBox || stub().resolves({ response: 1 }) // discard draft by default
      );
      sandbox.replace(
        dialog,
        "showSaveDialog",
        showSaveDialog ||
          stub().resolves({ cancelled: false, filePath: "/test" })
      );
      sandbox.replace(
        mockReduxLogicDeps,
        "writeFile",
        writeFile || stub().resolves()
      );
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

    // These button indexes are hardcoded into `stateHelpers.ensureDraftGetsSaved()`
    const CANCEL_BUTTON_INDEX = 0;
    const SAVE_UPLOAD_DRAFT_BUTTON_INDEX = 2;

    it("doesn't do anything if user cancels action when asked to save current draft", async () => {
      stubMethods({
        showMessageBox: stub().resolves({ response: CANCEL_BUTTON_INDEX }),
      });
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      const actionTypes = actions.list.map((a) => a.type);
      expect(actionTypes).to.include("ignore");
      expect(actionTypes).not.to.include(VIEW_UPLOADS_SUCCEEDED);
      expect(actionTypes).not.to.include(REQUEST_FAILED);
    });
    it("shows save dialog if user has another draft open", async () => {
      const showSaveDialog = stub().resolves({
        cancelled: false,
        filePath: "/foo",
      });
      stubMethods({
        showMessageBox: stub().resolves({
          response: SAVE_UPLOAD_DRAFT_BUTTON_INDEX,
        }),
        showSaveDialog,
      });
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      expect(showSaveDialog.called).to.be.true;
    });
    it("shows save dialog if user is editing another upload", async () => {
      const showSaveDialog = stub().resolves({
        cancelled: false,
        filePath: "/foo",
      });
      stubMethods({
        showMessageBox: stub().resolves({
          response: SAVE_UPLOAD_DRAFT_BUTTON_INDEX,
        }),
        showSaveDialog,
      });
      const { logicMiddleware, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: {
          ...nonEmptyStateForInitiatingUpload.selection,
        },
      });

      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      expect(showSaveDialog.called).to.be.true;
    });
    it("sets error alert if job passed is missing information", async () => {
      stubMethods({});
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(
        viewUploads([
          {
            ...mockSuccessfulUploadJob,
            status: JSSJobStatus.FAILED,
          },
        ])
      );
      await logicMiddleware.whenComplete();

      // after
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      expect(alert?.type).to.equal(AlertType.ERROR);
      expect(alert?.message).to.equal(
        `Upload ${mockSuccessfulUploadJob.jobName} has missing information`
      );
    });
    it("sets error alert if something fails while showing the warning dialog", async () => {
      const showMessageBox = stub().resolves({
        response: SAVE_UPLOAD_DRAFT_BUTTON_INDEX,
      });
      const writeFile = stub().rejects(new Error("foo"));
      stubMethods({ showMessageBox, writeFile });
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      // before
      expect(getAlert(store.getState())).to.be.undefined;

      // apply
      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      // after
      const alert = getAlert(store.getState());
      expect(alert).to.not.be.undefined;
      expect(alert?.type).to.equal(AlertType.ERROR);
      expect(alert?.message).to.equal("Could not save draft: foo");
    });
    it("allows users to open a failed upload", async () => {
      stubMethods({});
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );

      store.dispatch(viewUploads([mockFailedUploadJob]));
      await logicMiddleware.whenComplete();

      expect(actions.list.map(({ type }) => type)).includes(
        VIEW_UPLOADS_SUCCEEDED
      );
    });
    it("handles case where upload page is not open yet", async () => {
      stubMethods({});
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
      );

      let state = store.getState();
      expect(getPage(state)).to.equal(Page.MyUploads);
      expect(getView(state)).to.equal(Page.MyUploads);
      expect(getUpload(state)).to.be.empty;
      expect(getAppliedTemplate(state)).to.be.undefined;

      store.dispatch(viewUploads([mockSuccessfulUploadJob]));
      await logicMiddleware.whenComplete();

      state = store.getState();
      expect(getPage(state)).to.equal(Page.UploadWithTemplate);
      expect(getView(state)).to.equal(Page.UploadWithTemplate);
      expect(getUpload(state)).to.deep.equal({
        [getUploadRowKey({ file: fileMetadata.localFilePath || "" })]: {
          file: fileMetadata.localFilePath,
          fileId: "dog",
          "Favorite Color": ["Blue", "Green"],
          [AnnotationName.WELL]: ["A1", "B6"],
          [AnnotationName.PLATE_BARCODE]: ["abc"],
          [AnnotationName.IMAGING_SESSION]: [],
          channelId: undefined,
          fovId: undefined,
          positionIndex: undefined,
          scene: undefined,
          subImageName: undefined,
        },
      });
      expect(getAppliedTemplate(state)).to.not.be.undefined;
      expect(getPlateBarcodeToPlates(state)).to.deep.equal({
        abc: [
          {
            imagingSessionId: 4,
            name: "3 hours",
            wells: [],
          },
        ],
      });
    });
    it("dispatches requestFailed if boolean annotation type id is not defined", async () => {
      stubMethods({});
      mmsClient.getFileMetadata.resolves({
        ...fileMetadata,
        templateId: 1,
        annotations: [],
      });
      const { actions, logicMiddleware, store } = createMockReduxStore();

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
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState
      );

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
      stubMethods({});
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
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
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
      stubMethods({});
      const errorMessage = "foo";
      mmsClient.getTemplate.rejects(new Error(errorMessage));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateWithMetadata
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

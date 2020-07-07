import { dirname, resolve } from "path";

import { AxiosError } from "axios";
import { expect } from "chai";
import { isEmpty } from "lodash";
import { StateWithHistory } from "redux-undo";
import * as sinon from "sinon";
import { createSandbox, stub } from "sinon";

import selections from "../";
import { feedback } from "../../";
import { WELL_ANNOTATION_NAME } from "../../../constants";
import {
  GetPlateResponse,
  PlateResponse,
} from "../../../services/mms-client/types";
import {
  SERVICE_IS_DOWN_MESSAGE,
  SERVICE_MIGHT_BE_DOWN_MESSAGE,
} from "../../../util";
import { API_WAIT_TIME_SECONDS } from "../../constants";
import {
  getAlert,
  getRequestsInProgressContains,
} from "../../feedback/selectors";
import route from "../../route";
import { getPage } from "../../route/selectors";
import {
  createMockReduxStore,
  dialog,
  mmsClient,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockAuditInfo,
  mockSelection,
  mockState,
  mockWells,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import {
  AlertType,
  AppAlert,
  AsyncRequest,
  HTTP_STATUS,
  Page,
} from "../../types";
import { getUploadRowKey } from "../../upload/constants";
import { getUpload } from "../../upload/selectors";
import { clearStagedFiles, selectBarcode, selectWells } from "../actions";
import { GENERIC_GET_WELLS_ERROR_MESSAGE } from "../logics";
import { UploadFileImpl } from "../models/upload-file";
import {
  getSelectedBarcode,
  getSelectedFiles,
  getSelectedPlateId,
  getSelectedPlates,
  getSelectedWells,
  getStagedFiles,
  getWells,
} from "../selectors";
import {
  DragAndDropFileList,
  SelectionStateBranch,
  UploadFile,
  Well,
} from "../types";

describe("Selection logics", () => {
  const sandbox = createSandbox();
  const FILE_NAME = "cells.txt";
  const TEST_FILES_DIR = "files";
  const FOLDER_NAME = "a_directory";
  const FILE_FULL_PATH = resolve(__dirname, TEST_FILES_DIR, FILE_NAME);
  const FOLDER_FULL_PATH = resolve(__dirname, TEST_FILES_DIR, FOLDER_NAME);
  const EXPECTED_FILE_INDEX = 0;
  const EXPECTED_FOLDER_INDEX = 1;

  const testStagedFilesCreated = (stagedFiles: UploadFile[]) => {
    const file = stagedFiles[EXPECTED_FILE_INDEX];
    expect(file.isDirectory).to.equal(false);
    expect(file.name).to.equal(FILE_NAME);
    expect(file.path).to.equal(resolve(__dirname, TEST_FILES_DIR));
    expect(file.fullPath).to.equal(FILE_FULL_PATH);

    const folder = stagedFiles[EXPECTED_FOLDER_INDEX];
    expect(folder.isDirectory).to.equal(true);
    expect(folder.name).to.equal(FOLDER_NAME);
    expect(folder.path).to.equal(resolve(__dirname, TEST_FILES_DIR));
    expect(folder.fullPath).to.equal(FOLDER_FULL_PATH);
    expect(folder.files.length).to.equal(2);
  };

  afterEach(() => {
    sandbox.restore();
  });

  describe("loadFilesLogic", () => {
    let fileList: DragAndDropFileList;

    beforeEach(() => {
      // a FileList (https://developer.mozilla.org/en-US/docs/Web/API/FileList) does not have a constructor
      // and must implement some iterator methods. For the purposes of keeping these tests simple, we're casting
      // it twice to make the transpiler happy.
      fileList = {
        length: 2,
        0: {
          name: FILE_NAME,
          path: FILE_FULL_PATH,
        },
        1: {
          name: FOLDER_NAME,
          path: FOLDER_FULL_PATH,
        },
      };
    });

    it("Goes to SelectUploadType page if on DragAndDrop page", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(route.selectors.getPage(store.getState())).to.equal(
        Page.DragAndDrop
      );

      // apply
      store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(route.selectors.getPage(store.getState())).to.equal(
        Page.SelectUploadType
      );
    });

    it("Does not change page if not on DragAndDrop page", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        route: {
          page: Page.SelectUploadType,
          view: Page.SelectUploadType,
        },
      });

      // before
      expect(getPage(store.getState())).to.equal(Page.SelectUploadType);

      // apply
      store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(getPage(store.getState())).to.equal(Page.SelectUploadType);
    });

    it("stages all files loaded", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(getStagedFiles(store.getState()).length).to.equal(0);

      // apply
      store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

      // after
      await logicMiddleware.whenComplete();
      const stagedFiles = getStagedFiles(store.getState());
      expect(stagedFiles.length === fileList.length).to.be.true;
      expect(stagedFiles.length).to.equal(fileList.length);

      testStagedFilesCreated(stagedFiles);
    });

    it("should stop loading on success", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

      // apply
      store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
    });

    it("should stop loading on error", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

      // apply
      fileList = {
        length: 2,
        0: {
          name: "does_not_exist.txt",
          path: FILE_FULL_PATH,
        },
        1: {
          name: FOLDER_NAME,
          path: FOLDER_FULL_PATH,
        },
      };
      store.dispatch(selections.actions.loadFilesFromDragAndDrop(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
    });
  });

  describe("openFilesLogic", () => {
    let filePaths: string[];

    beforeEach(() => {
      filePaths = [FILE_FULL_PATH, FOLDER_FULL_PATH];
    });

    it("Goes to SelectUploadType page if on DragAndDrop page", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(getPage(store.getState())).to.equal(Page.DragAndDrop);

      // apply
      store.dispatch(selections.actions.openFilesFromDialog(filePaths));

      // after
      await logicMiddleware.whenComplete();
      expect(getPage(store.getState())).to.equal(Page.SelectUploadType);
    });

    it("Does not change page if not on DragAndDrop page", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        route: {
          page: Page.SelectUploadType,
          view: Page.SelectUploadType,
        },
      });

      // before
      expect(getPage(store.getState())).to.equal(Page.SelectUploadType);

      // apply
      store.dispatch(selections.actions.openFilesFromDialog(filePaths));

      // after
      await logicMiddleware.whenComplete();
      expect(getPage(store.getState())).to.equal(Page.SelectUploadType);
    });

    it("Stages all files opened", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(getStagedFiles(store.getState()).length).to.equal(0);

      // apply
      store.dispatch(selections.actions.openFilesFromDialog(filePaths));

      // after
      await logicMiddleware.whenComplete();
      const stagedFiles = getStagedFiles(store.getState());
      expect(stagedFiles.length).to.equal(filePaths.length);

      testStagedFilesCreated(stagedFiles);
    });

    it("Removes child files or directories", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(getStagedFiles(store.getState()).length).to.equal(0);

      // apply
      const filePathsWithDuplicates = [
        resolve(FOLDER_FULL_PATH, "test.txt"),
        FOLDER_FULL_PATH,
        resolve(FOLDER_FULL_PATH, "test2.txt"),
      ];
      store.dispatch(
        selections.actions.openFilesFromDialog(filePathsWithDuplicates)
      );

      // after
      await logicMiddleware.whenComplete();
      const stagedFiles = getStagedFiles(store.getState());
      expect(stagedFiles.length).to.equal(1);
      expect(stagedFiles[0].isDirectory).to.equal(true);
      expect(stagedFiles[0].path).to.equal(dirname(FOLDER_FULL_PATH));
      expect(stagedFiles[0].name).to.equal(FOLDER_NAME);
    });

    it("should stop loading on success", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

      // apply
      store.dispatch(selections.actions.openFilesFromDialog(filePaths));

      // after
      await logicMiddleware.whenComplete();
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
    });

    it("should stop loading on error", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

      // apply
      filePaths = [resolve(__dirname, TEST_FILES_DIR, "does_not_exist.txt")];
      store.dispatch(selections.actions.openFilesFromDialog(filePaths));

      // after
      await logicMiddleware.whenComplete();
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
    });
  });

  describe("getFilesInFolderLogic", () => {
    it("should add child files to folder", async () => {
      const folder = new UploadFileImpl(
        FOLDER_NAME,
        dirname(FOLDER_FULL_PATH),
        true,
        true
      );
      const stagedFiles = [
        new UploadFileImpl(FILE_NAME, dirname(FILE_FULL_PATH), false, true),
        folder,
      ];
      const selection: StateWithHistory<SelectionStateBranch> = getMockStateWithHistory(
        {
          ...mockSelection,
          stagedFiles,
        }
      );
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        selection,
      });

      // before
      const stagedFilesBefore = getStagedFiles(store.getState());
      expect(isEmpty(stagedFilesBefore[EXPECTED_FOLDER_INDEX].files)).to.equal(
        true
      );

      // apply
      store.dispatch(selections.actions.getFilesInFolder(folder));

      // after
      await logicMiddleware.whenComplete();
      const stagedFilesAfter = getStagedFiles(store.getState());
      const stagedFolder = stagedFilesAfter[EXPECTED_FOLDER_INDEX];
      expect(stagedFolder.files.length).to.equal(2);

      const stagedFolderContainsSecretsFolder = !!stagedFolder.files.find(
        (file) => {
          return (
            file.name === "secrets" &&
            file.path === FOLDER_FULL_PATH &&
            file.isDirectory
          );
        }
      );
      expect(stagedFolderContainsSecretsFolder).to.equal(true);

      const stagedFolderContainsTxtFile = !!stagedFolder.files.find((file) => {
        return (
          file.name === "more_cells.txt" &&
          file.path === FOLDER_FULL_PATH &&
          !file.isDirectory
        );
      });
      expect(stagedFolderContainsTxtFile).to.equal(true);
    });
  });

  describe("selectBarcodeLogic", () => {
    const barcode = "1234";
    const plateId = 1;
    let mockOkGetPlateResponse: GetPlateResponse;
    let mockBadGatewayResponse: AxiosError;
    const mockEmptyWell: Well = {
      cellPopulations: [],
      col: 0,
      plateId: 1,
      row: 0,
      solutions: [],
      wellId: 1,
    };
    const mockPlate: PlateResponse = {
      ...mockAuditInfo,
      barcode: "123456",
      comments: "",
      imagingSessionId: undefined,
      plateGeometryId: 1,
      plateId: 1,
      plateStatusId: 1,
      seededOn: "2018-02-14 23:03:52",
    };

    beforeEach(() => {
      mockOkGetPlateResponse = {
        plate: mockPlate,
        wells: [mockEmptyWell],
      };
      mockBadGatewayResponse = {
        config: {},
        isAxiosError: true,
        message: "Bad Gateway",
        name: "",
        response: {
          config: {},
          data: [],
          headers: {},
          status: HTTP_STATUS.BAD_GATEWAY,
          statusText: "Bad Gateway",
        },
      };
    });

    it("Sets wells, page, barcode, and plateId if GET wells is OK", async () => {
      const getStub = sinon
        .stub()
        .onFirstCall()
        .callsFake(() => {
          return Promise.resolve(mockOkGetPlateResponse);
        });
      sandbox.replace(mmsClient, "getPlate", getStub);
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      // apply
      store.dispatch(selectBarcode(barcode));

      // after
      await logicMiddleware.whenComplete();
      const state = store.getState();
      expect(getWells(state)).to.not.be.empty;
      expect(getPage(state)).to.equal(Page.AssociateFiles);
      expect(getSelectedBarcode(state)).to.equal(barcode);
      expect(getSelectedPlateId(state)).to.equal(plateId);
    });

    it("Does not retry GET wells request if response is non-Bad Gateway error", async () => {
      const getStub = sinon
        .stub()
        .onFirstCall()
        .callsFake(() => {
          return Promise.reject({
            ...mockOkGetPlateResponse,
            status: HTTP_STATUS.BAD_REQUEST,
          });
        });
      sandbox.replace(mmsClient, "getPlate", getStub);
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      // apply
      store.dispatch(selectBarcode(barcode));

      // after
      await logicMiddleware.whenComplete();
      const state = store.getState();
      expect(getRequestsInProgressContains(state, AsyncRequest.GET_PLATE)).to.be
        .false;
      expect(getStub.callCount).to.equal(1);

      const alert = getAlert(state);
      expect(alert).to.not.be.undefined;

      if (alert) {
        expect(alert.type).to.equal(AlertType.ERROR);
        expect(alert.message).to.equal(
          GENERIC_GET_WELLS_ERROR_MESSAGE(barcode)
        );
      }
    });

    it("Shows error message if it only receives Bad Gateway error for 20 seconds", async function () {
      // here we're using a fake clock so that 20 seconds passes more quickly and to give control
      // over to the test in terms of timing.
      this.clock = sinon.useFakeTimers(new Date().getTime());

      // extends timeout for this test since we're testing a potentially long running process
      const waitTime = API_WAIT_TIME_SECONDS * 1000 + 3000;
      this.timeout(waitTime);

      let secondsPassed = 0;
      const incrementMs = 5000;

      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      let firstAlert: AppAlert | undefined;

      // increment clock on every get call by 5 seconds
      const getStub = sinon.stub().callsFake(() => {
        this.clock.tick(incrementMs);
        secondsPassed += incrementMs / 1000;

        if (!firstAlert) {
          firstAlert = getAlert(store.getState());
        }

        return Promise.reject(mockBadGatewayResponse);
      });
      sandbox.replace(mmsClient, "getPlate", getStub);

      // apply
      store.dispatch(selectBarcode(barcode));

      // after
      await logicMiddleware.whenComplete();
      if (secondsPassed >= API_WAIT_TIME_SECONDS) {
        const state = store.getState();
        const currentAlert: AppAlert | undefined = getAlert(state);
        expect(getStub.callCount).to.be.greaterThan(1);
        expect(firstAlert).to.not.be.undefined;

        if (firstAlert) {
          expect(firstAlert.type).to.equal(AlertType.WARN);
          expect(firstAlert.message).to.equal(
            SERVICE_MIGHT_BE_DOWN_MESSAGE("MMS")
          );
        }

        expect(currentAlert).to.not.be.undefined;

        if (currentAlert) {
          expect(currentAlert.type).to.equal(AlertType.ERROR);
          expect(currentAlert.message).to.equal(SERVICE_IS_DOWN_MESSAGE("MMS"));
        }
      }
    });

    it("Can handle successful response after retrying GET wells request", async function () {
      this.timeout(API_WAIT_TIME_SECONDS * 1000 + 3000);
      const getStub = sinon
        .stub()
        .onFirstCall()
        .rejects(mockBadGatewayResponse)
        .onSecondCall()
        .callsFake(() => {
          return Promise.resolve(mockOkGetPlateResponse);
        });
      sandbox.replace(mmsClient, "getPlate", getStub);
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      // apply
      store.dispatch(selectBarcode(barcode));

      // after
      await logicMiddleware.whenComplete();
      const state = store.getState();
      expect(getWells(state)).to.not.be.empty;
      expect(getPage(state)).to.equal(Page.AssociateFiles);
      expect(getSelectedBarcode(state)).to.equal(barcode);
      expect(getSelectedPlateId(state)).to.equal(plateId);
    });

    it("Builds map of imaging session ids to plate responses on OK response", async () => {
      const getStub = sinon
        .stub()
        .onFirstCall()
        .resolves(mockOkGetPlateResponse);
      const mockPlateResponse2 = {
        plate: {
          ...mockPlate,
          imagingSessionId: 1,
          plateId: 2,
        },
        wells: [
          {
            ...mockEmptyWell,
            plateId: 2,
          },
        ],
      };
      getStub.onSecondCall().resolves(mockPlateResponse2);
      sandbox.replace(mmsClient, "getPlate", getStub);
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      // apply
      store.dispatch(selectBarcode(barcode, [null, 1]));

      // after
      await logicMiddleware.whenComplete();
      const state = store.getState();
      expect(getWells(state)).to.deep.equal({
        0: mockOkGetPlateResponse.wells,
        1: mockPlateResponse2.wells,
      });
      expect(getSelectedPlates(state)).to.deep.equal({
        0: mockOkGetPlateResponse.plate,
        1: mockPlateResponse2.plate,
      });
      expect(getPage(state)).to.equal(Page.AssociateFiles);
      expect(getSelectedBarcode(state)).to.equal(barcode);
      expect(getSelectedPlateId(state)).to.equal(plateId);
    });
  });

  describe("selectWellsLogic", () => {
    it("filters out unmodified wells", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: getMockStateWithHistory({
          ...mockSelection,
          selectedWells: [],
        }),
      });

      // before
      expect(getSelectedWells(store.getState())).to.be.empty;

      // apply
      const cells = mockWells[0].map((w) => ({ col: w.col, row: w.row }));
      store.dispatch(selectWells(cells));

      // after
      expect(getSelectedWells(store.getState()).length).to.equal(4);
    });
  });

  describe("clearStagedFilesLogic", () => {
    it("does not do anything if cancel clicked", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockState.selection.present,
          files: ["/path/test.txt"],
          stagedFiles: [new UploadFileImpl("test.txt", "/path", false, true)],
        }),
        upload: getMockStateWithHistory({
          ...mockState.upload.present,
          [getUploadRowKey({ file: "/path/test.txt" })]: {
            barcode: "abc",
            file: "/path/test.txt",
            [WELL_ANNOTATION_NAME]: [],
          },
        }),
      });
      const showMessageBoxStub = stub().resolves({ response: 0 });
      sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);

      expect(getSelectedFiles(store.getState())).to.not.be.empty;
      expect(getStagedFiles(store.getState())).to.not.be.empty;
      expect(getUpload(store.getState())).to.not.be.empty;

      store.dispatch(clearStagedFiles());

      await logicMiddleware.whenComplete();
      expect(getSelectedFiles(store.getState())).to.not.be.empty;
      expect(getStagedFiles(store.getState())).to.not.be.empty;
      expect(getUpload(store.getState())).to.not.be.empty;
    });

    it("clears staged files, selected files, and upload", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockState.selection.present,
          files: ["/path/test.txt"],
          stagedFiles: [new UploadFileImpl("test.txt", "/path", false, true)],
        }),
      });

      const showMessageBoxStub = stub().resolves({ response: 1 });
      sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);

      expect(getSelectedFiles(store.getState())).to.not.be.empty;
      expect(getStagedFiles(store.getState())).to.not.be.empty;
      expect(getUpload(store.getState())).to.not.be.empty;

      store.dispatch(clearStagedFiles());

      await logicMiddleware.whenComplete();
      expect(getSelectedFiles(store.getState())).to.be.empty;
      expect(getStagedFiles(store.getState())).to.be.empty;
      expect(getUpload(store.getState())).to.be.empty;
    });
  });
});

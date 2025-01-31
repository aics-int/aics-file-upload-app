import { resolve } from "path";

import { expect } from "chai";
import { createSandbox, SinonStubbedInstance, createStubInstance } from "sinon";

import selections from "../";
import { feedback } from "../../";
import { AnnotationName } from "../../../constants";
import MetadataManagementService from "../../../services/metadata-management-service";
import { UploadType } from "../../../types";
import { getPage } from "../../route/selectors";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockSelection,
  mockState,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { Page } from "../../types";
import { updateUploadRows } from "../../upload/actions";
import { getUpload } from "../../upload/selectors";
import { applyMassEdit, startMassEdit, stopCellDrag } from "../actions";
import { getMassEditRow, getRowsSelectedForMassEdit } from "../selectors";

describe("Selection logics", () => {
  const sandbox = createSandbox();
  const FILE_NAME = "cells.txt";
  const TEST_FILES_DIR = "files";
  const FOLDER_NAME = "a_directory";
  const FILE_FULL_PATH = resolve(__dirname, TEST_FILES_DIR, FILE_NAME);
  const FOLDER_FULL_PATH = resolve(__dirname, TEST_FILES_DIR, FOLDER_NAME);

  let mmsClient: SinonStubbedInstance<MetadataManagementService>;

  beforeEach(() => {
    mmsClient = createStubInstance(MetadataManagementService);
    sandbox.replace(mockReduxLogicDeps, "mmsClient", mmsClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("loadFilesLogic", () => {
    let fileList: string[];

    beforeEach(() => {
      fileList = [FILE_FULL_PATH, FOLDER_FULL_PATH];
    });

    it("Does not change page if not on AddCustomData page", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        route: {
          page: Page.UploadWithTemplate,
          view: Page.UploadWithTemplate,
        },
      });

      // before
      expect(getPage(store.getState())).to.equal(Page.UploadWithTemplate);

      // apply
      store.dispatch(selections.actions.loadFiles(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(getPage(store.getState())).to.equal(Page.UploadWithTemplate);
    });

    it("sets files up for upload", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(getUpload(store.getState())).to.be.empty;

      // apply
      store.dispatch(selections.actions.selectUploadType(UploadType.File));
      store.dispatch(selections.actions.loadFiles([FILE_FULL_PATH]));

      // after
      await logicMiddleware.whenComplete();
      const upload = getUpload(store.getState());

      expect(Object.keys(upload)).to.be.lengthOf(1);
      const file = upload[Object.keys(upload)[0]];
      expect(file.file).to.equal(FILE_FULL_PATH);
    });

    it("should stop loading on success", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

      // apply
      store.dispatch(selections.actions.loadFiles(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
    });

    it("should stop loading on error", async () => {
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);

      // apply
      store.dispatch(selections.actions.loadFiles(fileList));

      // after
      await logicMiddleware.whenComplete();
      expect(feedback.selectors.getIsLoading(store.getState())).to.equal(false);
    });
  });

  describe("startMassEditLogic", () => {
    it("sets rows selected & added empty row object", () => {
      // Arrange
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
      });
      const selectedRowIds = ["1", "3", "17"];
      // (sanity-check)
      expect(getMassEditRow(store.getState())).to.be.undefined;
      expect(getRowsSelectedForMassEdit(store.getState())).to.be.undefined;

      // Act
      store.dispatch(startMassEdit(selectedRowIds));

      // Assert
      expect(getMassEditRow(store.getState())).to.deep.equal({
        "Favorite Color": [],
      });
      expect(getRowsSelectedForMassEdit(store.getState())).to.deep.equal(
        selectedRowIds
      );
    });
  });

  describe("applyMassEditLogic", () => {
    it("applies non-empty data to rows", async () => {
      // Arrange
      const massEditRow = {
        color: ["blue", "green"],
        [AnnotationName.NOTES]: ["hello"],
      };
      const rowsSelectedForMassEdit = ["1", "100", "2"];
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: {
          ...mockSelection,
          rowsSelectedForMassEdit,
          massEditRow: {
            ...massEditRow,
            // Add some junk to test exclusion
            CellLine: [],
          },
        },
      });

      // Act
      store.dispatch(applyMassEdit());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          updateUploadRows(rowsSelectedForMassEdit, massEditRow)
        )
      ).to.be.true;
    });
  });

  describe("stopCellDragLogic", () => {
    it("send update for rows selected", async () => {
      // Arrange
      const uploadValue = "false";
      const rowIdsSelectedForDragEvent = ["21", "3", "9", "18"];
      const rowsSelectedForDragEvent = rowIdsSelectedForDragEvent.map(
        (id, index) => ({
          id,
          index,
        })
      );
      const cellAtDragStart = {
        rowId: "14",
        columnId: "Is Aligned?",
        rowIndex: 2,
      };
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        selection: {
          ...mockSelection,
          cellAtDragStart,
          rowsSelectedForDragEvent,
        },
        upload: getMockStateWithHistory({
          [cellAtDragStart.rowId]: {
            file: "/some/path/to/a/file.txt",
            [cellAtDragStart.columnId]: uploadValue,
          },
        }),
      });

      // Act
      store.dispatch(stopCellDrag());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          updateUploadRows(rowIdsSelectedForDragEvent, {
            [cellAtDragStart.columnId]: uploadValue,
          })
        )
      ).to.be.true;
    });
  });
});

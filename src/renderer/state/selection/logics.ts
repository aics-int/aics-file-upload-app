import { createLogic } from "redux-logic";

import { AnnotationName } from "../../constants";
import type { UploadType } from "../../types";
import { convertToVastPath } from "../../util";
import { setAlert, startLoading, stopLoading } from "../feedback/actions";
import { getBooleanAnnotationTypeId } from "../metadata/selectors";
import { getAppliedTemplate } from "../template/selectors";
import {
  AlertType,
  MassEditRow,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
  UploadRowTableId,
} from "../types";
import { addUploadFiles, updateUploadRows } from "../upload/actions";
import { getUpload } from "../upload/selectors";
import { batchActions } from "../util";

import {
  APPLY_MASS_EDIT,
  LOAD_FILES,
  START_MASS_EDIT,
  STOP_CELL_DRAG,
} from "./constants";
import {
  getCellAtDragStart,
  getMassEditRow,
  getRowsSelectedForDragEvent,
  getRowsSelectedForMassEdit,
  getUploadType,
} from "./selectors";
import type { LoadFilesAction } from "./types";

const loadFilesLogic = createLogic({
  process: async (
    {
      action,
      getState,
    }: ReduxLogicProcessDependenciesWithAction<LoadFilesAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    dispatch(startLoading());
    try {
      const uploadType: UploadType | null = getUploadType(getState());
      if (!uploadType) {
        throw new Error(
          "Cannot parse selected files. Upload Type not defined."
        );
      }
      dispatch(stopLoading()); // Stop loading indicator after upload type check
      dispatch(
        addUploadFiles(
          action.payload.map((item: any) => {
            if (typeof item === "string") {
              // If the item is a string, it's a path to a file on disk, and came from the 'Open File' dialog.'
              return { file: convertToVastPath(item), uploadType };
            } else {
              // If the item is an object, it's a manually entered file name and path from our dev feature.'
              return {
                file: convertToVastPath(item.path),
                uploadType,
                customFileName: item.name,
              };
            }
          })
        )
      );
      done();
    } catch (e) {
      dispatch(
        batchActions([
          stopLoading(),
          setAlert({
            message: `Encountered error while resolving files: ${e}`,
            type: AlertType.ERROR,
          }),
        ])
      );
    }

    done();
  },
  type: LOAD_FILES,
});

// Initialize massEditRow with necessary template annotations
const startMassEditLogic = createLogic({
  transform: (
    { action, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject?: ReduxLogicRejectCb
  ) => {
    const template = getAppliedTemplate(getState());
    const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());
    if (!template || !booleanAnnotationTypeId) {
      reject && reject(action);
      return;
    }
    const { annotations } = template;
    const massEditRow = annotations.reduce(
      (row, annotation) => ({
        ...row,
        [annotation.name]: [],
      }),
      {}
    );
    next({
      ...action,
      payload: {
        massEditRow,
        rowsSelectedForMassEdit: action.payload,
      },
    });
  },
  type: START_MASS_EDIT,
});

/**
 * shows a loading indicator which spins while the caller blocks the UI thread
 * used for mass edit applies and drag and drop applies across many files
 * the caller need to call stopLoading once the updates are applied
 */
async function startLoadingAndAwaitPaint(dispatch: ReduxLogicNextCb) {
  dispatch(startLoading());
  await new Promise((resolve) =>
    typeof requestAnimationFrame === "function"
      ? requestAnimationFrame(() => requestAnimationFrame(resolve))
      : setTimeout(resolve, 0)
  );
}

const applyMassEditLogic = createLogic({
  process: async (
    { ctx }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { rowIds, massEditRow } = ctx;
    const rowData = Object.entries(massEditRow as MassEditRow).reduce(
      (row, [key, value]) => ({
        ...row,
        // Exclude empty values
        ...((value.length || key === AnnotationName.NOTES) && {
          [key]: value,
        }),
      }),
      {}
    );
    // mass edit blocks the UI thread while every row is updated, show loading wheel
    // updateUploadRowsLogic stops the indicator once the changes are done
    await startLoadingAndAwaitPaint(dispatch);
    dispatch(updateUploadRows(rowIds, rowData));
    done();
  },
  transform: (
    { action, ctx, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const massEditRow = getMassEditRow(getState());
    const rowIds = getRowsSelectedForMassEdit(getState());
    ctx.massEditRow = massEditRow;
    ctx.rowIds = rowIds;
    next(action);
  },
  type: APPLY_MASS_EDIT,
});

const stopCellDragLogic = createLogic({
  process: async (
    { ctx, getState }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { cellAtDragStart, rows } = ctx;
    if (cellAtDragStart && rows?.length) {
      const upload = getUpload(getState());
      const columnId = cellAtDragStart.columnId;
      // get row ids that dont have autofill
      const notAutofilledRowIds = rows
        .map((row: UploadRowTableId) => row.id)
        .filter(
          (id: string) => !upload[id]?.autofilledFields?.includes(columnId)
        );
      const value = upload[cellAtDragStart.rowId][columnId];

      // drag to copy protection against overwriting rows already autofilled by mxs
      if (notAutofilledRowIds.length) {
        // drag to copy blocks the UI thread just like a mass edi
        // updateUploadRowsLogic stops the indicator once the changes are done
        await startLoadingAndAwaitPaint(dispatch);
        dispatch(updateUploadRows(notAutofilledRowIds, { [columnId]: value }));
      }
    }
    done();
  },
  transform: (
    { action, ctx, getState }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb
  ) => {
    const cellAtDragStart = getCellAtDragStart(getState());
    const rows = getRowsSelectedForDragEvent(getState());
    ctx.cellAtDragStart = cellAtDragStart;
    ctx.rows = rows;
    next(action);
  },
  type: STOP_CELL_DRAG,
});

export default [
  applyMassEditLogic,
  loadFilesLogic,
  startMassEditLogic,
  stopCellDragLogic,
];

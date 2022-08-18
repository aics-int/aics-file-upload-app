import { createSelector } from "reselect";

import { JSSJobStatus } from "../../services/job-status-client/types";
import { ROW_COUNT_COLUMN } from "../constants";
import { MassEditRow, State } from "../types";

// BASIC SELECTORS
export const getCellAtDragStart = (state: State) =>
  state.selection.cellAtDragStart;
export const getRowsSelectedForDragEvent = (state: State) =>
  state.selection.rowsSelectedForDragEvent;
export const getSelectedUser = (state: State) => state.selection.user;
export const getRowsSelectedForMassEdit = (state: State) =>
  state.selection.rowsSelectedForMassEdit;
export const getSelectedUploads = (state: State) => state.selection.uploads;
export const getMassEditRow = (state: State) => state.selection.massEditRow;

// COMPOSED SELECTORS
export const getIsExistingUpload = createSelector(
  [getSelectedUploads],
  (uploads): boolean => uploads.length !== 0
);

export const getAreSelectedUploadsInFlight = createSelector(
  [getSelectedUploads],
  (selectedUploads): boolean =>
    selectedUploads.some(
      (upload) =>
        ![JSSJobStatus.SUCCEEDED, JSSJobStatus.FAILED].includes(upload.status)
    )
);

// Maps MassEditRow to shape of data needed by react-table
export const getMassEditRowAsTableRow = createSelector(
  [getMassEditRow, getRowsSelectedForMassEdit],
  (massEditRow, rowsSelectedForMassEdit): MassEditRow => ({
    ...(massEditRow && massEditRow),
    [ROW_COUNT_COLUMN]: rowsSelectedForMassEdit?.length,
  })
);

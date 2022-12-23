import { userInfo } from "os";

import { AnyAction } from "redux";

import { VIEW_UPLOADS, RESET_UPLOAD } from "../route/constants";
import { ViewUploadsAction, ResetUploadAction } from "../route/types";
import {
  SelectionStateBranch,
  TypeToDescriptionMap,
  UploadTabSelections,
} from "../types";
import { REPLACE_UPLOAD } from "../upload/constants";
import { ReplaceUploadAction } from "../upload/types";
import { makeReducer } from "../util";

import {
  ADD_ROW_TO_DRAG_EVENT,
  APPLY_MASS_EDIT,
  CANCEL_MASS_EDIT,
  REMOVE_ROW_FROM_DRAG_EVENT,
  START_CELL_DRAG,
  START_MASS_EDIT,
  STOP_CELL_DRAG,
  UPDATE_MASS_EDIT_ROW,
} from "./constants";
import {
  AddRowToDragEventAction,
  ApplyMassEditAction,
  CancelMassEditAction,
  RemoveRowFromDragEventAction,
  StartCellDragAction,
  StartMassEditAction,
  StopCellDragAction,
  UpdateMassEditRowAction,
} from "./types";

const uploadTabSelectionInitialState: UploadTabSelections = {
  cellAtDragStart: undefined,
  uploads: [],
  massEditRow: undefined,
  rowsSelectedForMassEdit: undefined,
};

export const initialState: SelectionStateBranch = {
  ...uploadTabSelectionInitialState,
  user: userInfo().username,
};

const actionToConfigMap: TypeToDescriptionMap<SelectionStateBranch> = {
  [START_MASS_EDIT]: {
    accepts: (action: AnyAction): action is StartMassEditAction =>
      action.type === START_MASS_EDIT,
    perform: (state: SelectionStateBranch, action: StartMassEditAction) => ({
      ...state,
      ...action.payload,
    }),
  },
  [APPLY_MASS_EDIT]: {
    accepts: (action: AnyAction): action is ApplyMassEditAction =>
      action.type === APPLY_MASS_EDIT,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      massEditRow: undefined,
      rowsSelectedForMassEdit: undefined,
    }),
  },
  [CANCEL_MASS_EDIT]: {
    accepts: (action: AnyAction): action is CancelMassEditAction =>
      action.type === CANCEL_MASS_EDIT,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      massEditRow: undefined,
      rowsSelectedForMassEdit: undefined,
    }),
  },
  [REPLACE_UPLOAD]: {
    accepts: (action: AnyAction): action is ReplaceUploadAction =>
      action.type === REPLACE_UPLOAD,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      ...uploadTabSelectionInitialState,
    }),
  },
  [RESET_UPLOAD]: {
    accepts: (action: AnyAction): action is ResetUploadAction =>
      action.type === RESET_UPLOAD,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      ...uploadTabSelectionInitialState,
    }),
  },
  [ADD_ROW_TO_DRAG_EVENT]: {
    accepts: (action: AnyAction): action is AddRowToDragEventAction =>
      action.type === ADD_ROW_TO_DRAG_EVENT,
    perform: (
      state: SelectionStateBranch,
      action: AddRowToDragEventAction
    ) => ({
      ...state,
      rowsSelectedForDragEvent: state.rowsSelectedForDragEvent?.find(
        (row) => row.id === action.payload.id
      )
        ? state.rowsSelectedForDragEvent
        : [...(state.rowsSelectedForDragEvent || []), action.payload],
    }),
  },
  [REMOVE_ROW_FROM_DRAG_EVENT]: {
    accepts: (action: AnyAction): action is RemoveRowFromDragEventAction =>
      action.type === REMOVE_ROW_FROM_DRAG_EVENT,
    perform: (
      state: SelectionStateBranch,
      action: RemoveRowFromDragEventAction
    ) => ({
      ...state,
      rowsSelectedForDragEvent: state.rowsSelectedForDragEvent?.filter(
        (row) => !action.payload.includes(row.id)
      ),
    }),
  },
  [START_CELL_DRAG]: {
    accepts: (action: AnyAction): action is StartCellDragAction =>
      action.type === START_CELL_DRAG,
    perform: (state: SelectionStateBranch, action: StartCellDragAction) => ({
      ...state,
      cellAtDragStart: action.payload,
    }),
  },
  [STOP_CELL_DRAG]: {
    accepts: (action: AnyAction): action is StopCellDragAction =>
      action.type === STOP_CELL_DRAG,
    perform: (state: SelectionStateBranch) => ({
      ...state,
      cellAtDragStart: undefined,
      rowsSelectedForDragEvent: undefined,
    }),
  },
  [VIEW_UPLOADS]: {
    accepts: (action: AnyAction): action is ViewUploadsAction =>
      action.type === VIEW_UPLOADS,
    perform: (state: SelectionStateBranch, action: ViewUploadsAction) => ({
      ...state,
      uploads: action.payload,
    }),
  },
  [UPDATE_MASS_EDIT_ROW]: {
    accepts: (action: AnyAction): action is UpdateMassEditRowAction =>
      action.type === UPDATE_MASS_EDIT_ROW,
    perform: (
      state: SelectionStateBranch,
      action: UpdateMassEditRowAction
    ) => ({
      ...state,
      massEditRow: {
        ...state.massEditRow,
        ...action.payload,
      },
    }),
  },
};

export default makeReducer<SelectionStateBranch>(
  actionToConfigMap,
  initialState
);

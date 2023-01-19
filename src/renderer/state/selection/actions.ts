import { OpenTemplateEditorAction } from "../feedback/types";
import { MassEditRow } from "../types";

import {
  ADD_ROW_TO_DRAG_EVENT,
  APPLY_MASS_EDIT,
  CANCEL_MASS_EDIT,
  LOAD_FILES,
  OPEN_TEMPLATE_EDITOR,
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
  LoadFilesAction,
  RemoveRowFromDragEventAction,
  StartCellDragAction,
  StartMassEditAction,
  StopCellDragAction,
  UpdateMassEditRowAction,
} from "./types";

export function loadFiles(files: string[]): LoadFilesAction {
  return {
    autoSave: true,
    payload: files,
    type: LOAD_FILES,
  };
}

export function startMassEdit(selectedRowIds: string[]): StartMassEditAction {
  return {
    payload: selectedRowIds,
    type: START_MASS_EDIT,
  };
}

export function applyMassEdit(): ApplyMassEditAction {
  return {
    type: APPLY_MASS_EDIT,
  };
}

export function cancelMassEdit(): CancelMassEditAction {
  return {
    type: CANCEL_MASS_EDIT,
  };
}

export function addRowToDragEvent(
  id: string,
  index: number
): AddRowToDragEventAction {
  return {
    payload: { id, index },
    type: ADD_ROW_TO_DRAG_EVENT,
  };
}

export function removeRowsFromDragEvent(
  rowIds: string[]
): RemoveRowFromDragEventAction {
  return {
    payload: rowIds,
    type: REMOVE_ROW_FROM_DRAG_EVENT,
  };
}

export function startCellDrag(
  rowId: string,
  rowIndex: number,
  columnId: string
): StartCellDragAction {
  return {
    payload: { rowId, rowIndex, columnId },
    type: START_CELL_DRAG,
  };
}

export function stopCellDrag(): StopCellDragAction {
  return {
    type: STOP_CELL_DRAG,
  };
}

export function openTemplateEditor(
  templateId?: number
): OpenTemplateEditorAction {
  return {
    payload: templateId,
    type: OPEN_TEMPLATE_EDITOR,
  };
}

export function updateMassEditRow(
  upload: MassEditRow
): UpdateMassEditRowAction {
  return {
    payload: upload,
    type: UPDATE_MASS_EDIT_ROW,
  };
}

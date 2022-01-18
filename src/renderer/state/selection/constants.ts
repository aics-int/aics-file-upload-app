import { makeConstant } from "../util";

const BRANCH_NAME = "selection";

export const ADD_ROW_TO_DRAG_EVENT = makeConstant(
  BRANCH_NAME,
  "add-row-to-drag-event"
);
export const APPLY_MASS_EDIT = makeConstant(BRANCH_NAME, "apply-mass-edit");
export const CANCEL_MASS_EDIT = makeConstant(BRANCH_NAME, "cancel-mass-edit");
export const CLOSE_SUB_FILE_SELECTION_MODAL = makeConstant(
  BRANCH_NAME,
  "close-sub-file-selection-modal"
);
export const LOAD_FILES = makeConstant(BRANCH_NAME, "load-files");
export const OPEN_SUB_FILE_SELECTION_MODAL = makeConstant(
  BRANCH_NAME,
  "open-sub-file-selection-modal"
);
export const OPEN_TEMPLATE_EDITOR = makeConstant(
  BRANCH_NAME,
  "open-template-editor"
);
export const REMOVE_ROW_FROM_DRAG_EVENT = makeConstant(
  BRANCH_NAME,
  "remove-row-from-drag-event"
);
export const START_CELL_DRAG = makeConstant(BRANCH_NAME, "start-cell-drag");
export const START_MASS_EDIT = makeConstant(BRANCH_NAME, "start-mass-edit");
export const STOP_CELL_DRAG = makeConstant(BRANCH_NAME, "stop-cell-drag");
export const UPDATE_MASS_EDIT_ROW = makeConstant(
  BRANCH_NAME,
  "update-mass-edit-row"
);

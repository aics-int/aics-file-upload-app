import { omit, uniq, without } from "lodash";
import { AnyAction } from "redux";
import undoable, { UndoableOptions } from "redux-undo";

import {
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../constants";
import { RESET_HISTORY } from "../metadata/constants";
import { CLOSE_UPLOAD_TAB } from "../route/constants";
import { CloseUploadTabAction } from "../route/types";
import { SET_APPLIED_TEMPLATE } from "../template/constants";
import { SetAppliedTemplateAction } from "../template/types";
import { TypeToDescriptionMap } from "../types";
import { getReduxUndoFilterFn, makeReducer } from "../util";

import {
  ASSOCIATE_FILES_AND_WELLS,
  ASSOCIATE_FILES_AND_WORKFLOWS,
  CLEAR_UPLOAD,
  CLEAR_UPLOAD_HISTORY,
  DELETE_UPLOADS,
  getUploadRowKey,
  INITIATE_UPLOAD,
  JUMP_TO_PAST_UPLOAD,
  JUMP_TO_UPLOAD,
  REMOVE_FILE_FROM_ARCHIVE,
  REMOVE_FILE_FROM_ISILON,
  REPLACE_UPLOAD,
  RETRY_UPLOAD,
  UNDO_FILE_WELL_ASSOCIATION,
  UNDO_FILE_WORKFLOW_ASSOCIATION,
  UPDATE_UPLOAD,
  UPDATE_UPLOAD_ROWS,
  UPDATE_UPLOADS,
} from "./constants";
import { getUpload } from "./selectors";
import {
  AssociateFilesAndWellsAction,
  AssociateFilesAndWorkflowsAction,
  ClearUploadAction,
  RemoveFileFromArchiveAction,
  RemoveFileFromIsilonAction,
  RemoveUploadsAction,
  ReplaceUploadAction,
  UndoFileWellAssociationAction,
  UndoFileWorkflowAssociationAction,
  UpdateUploadAction,
  UpdateUploadRowsAction,
  UpdateUploadsAction,
  UploadStateBranch,
} from "./types";

export const initialState = {};

const actionToConfigMap: TypeToDescriptionMap = {
  [ASSOCIATE_FILES_AND_WELLS]: {
    accepts: (action: AnyAction): action is AssociateFilesAndWellsAction =>
      action.type === ASSOCIATE_FILES_AND_WELLS,
    perform: (
      state: UploadStateBranch,
      action: AssociateFilesAndWellsAction
    ) => {
      const nextState = { ...state };

      const { barcode, wellIds, rowIds } = action.payload;

      return rowIds.reduce((accum: UploadStateBranch, id) => {
        const key = getUploadRowKey(id);
        return {
          ...accum,
          [key]: {
            ...accum[key],
            barcode,
            file: id.file,
            positionIndex: id.positionIndex,
            scene: id.scene,
            subImageName: id.subImageName,
            [WELL_ANNOTATION_NAME]:
              accum[key] && accum[key][WELL_ANNOTATION_NAME]
                ? uniq([
                    ...(accum[key][WELL_ANNOTATION_NAME] || []),
                    ...wellIds,
                  ])
                : wellIds,
          },
        };
      }, nextState);
    },
  },
  [ASSOCIATE_FILES_AND_WORKFLOWS]: {
    accepts: (action: AnyAction): action is AssociateFilesAndWorkflowsAction =>
      action.type === ASSOCIATE_FILES_AND_WORKFLOWS,
    perform: (
      state: UploadStateBranch,
      action: AssociateFilesAndWorkflowsAction
    ) => {
      const nextState = { ...state };

      const { fullPaths, workflows } = action.payload;
      const workflowNames = uniq(workflows.map((w) => w.name));

      return fullPaths.reduce((accum: UploadStateBranch, file: string) => {
        const key = getUploadRowKey({ file });
        return {
          ...accum,
          [key]: {
            ...accum[key],
            file,
            [WORKFLOW_ANNOTATION_NAME]:
              accum[key] && accum[key][WORKFLOW_ANNOTATION_NAME]
                ? uniq([
                    ...(accum[key][WORKFLOW_ANNOTATION_NAME] || []),
                    ...workflowNames,
                  ])
                : workflowNames,
          },
        };
      }, nextState);
    },
  },
  [CLEAR_UPLOAD]: {
    accepts: (action: AnyAction): action is ClearUploadAction =>
      action.type === CLEAR_UPLOAD,
    perform: () => ({}),
  },
  [UNDO_FILE_WELL_ASSOCIATION]: {
    accepts: (action: AnyAction): action is UndoFileWellAssociationAction =>
      action.type === UNDO_FILE_WELL_ASSOCIATION,
    perform: (
      state: UploadStateBranch,
      action: UndoFileWellAssociationAction
    ) => {
      const { deleteUpload, rowId, wellIds: wellIdsToRemove } = action.payload;
      const key = getUploadRowKey(rowId);
      if (!state[key]) {
        return state;
      }
      const wellIds = without(
        state[key][WELL_ANNOTATION_NAME] || [],
        ...wellIdsToRemove
      );
      if (!wellIds.length && deleteUpload) {
        const stateWithoutFile = { ...state };
        delete stateWithoutFile[key];
        return stateWithoutFile;
      }
      return {
        ...state,
        [key]: {
          ...state[key],
          [WELL_ANNOTATION_NAME]: wellIds,
        },
      };
    },
  },
  [UNDO_FILE_WORKFLOW_ASSOCIATION]: {
    accepts: (action: AnyAction): action is UndoFileWorkflowAssociationAction =>
      action.type === UNDO_FILE_WORKFLOW_ASSOCIATION,
    perform: (
      state: UploadStateBranch,
      action: UndoFileWorkflowAssociationAction
    ) => {
      const key = getUploadRowKey({ file: action.payload.fullPath });
      if (!state[key]) {
        return state;
      }
      const currentWorkflows = state[key][WORKFLOW_ANNOTATION_NAME] || [];
      const workflows = without(
        currentWorkflows,
        ...action.payload.workflowNames
      );
      if (!workflows.length) {
        return omit(state, key);
      }
      return {
        ...state,
        [key]: {
          ...state[key],
          [WORKFLOW_ANNOTATION_NAME]: workflows,
        },
      };
    },
  },
  [DELETE_UPLOADS]: {
    accepts: (action: AnyAction): action is RemoveUploadsAction =>
      action.type === DELETE_UPLOADS,
    perform: (state: UploadStateBranch, action: RemoveUploadsAction) =>
      omit(state, action.payload),
  },
  [UPDATE_UPLOAD]: {
    accepts: (action: AnyAction): action is UpdateUploadAction =>
      action.type === UPDATE_UPLOAD,
    perform: (state: UploadStateBranch, action: UpdateUploadAction) => {
      // prevent updating an upload that doesn't exist anymore
      if (!state[action.payload.key]) {
        return state;
      }

      return {
        ...state,
        [action.payload.key]: {
          ...state[action.payload.key],
          ...action.payload.upload,
        },
      };
    },
  },
  [UPDATE_UPLOAD_ROWS]: {
    accepts: (action: AnyAction): action is UpdateUploadRowsAction =>
      action.type === UPDATE_UPLOAD_ROWS,
    perform: (state: UploadStateBranch, action: UpdateUploadRowsAction) => {
      const { metadataUpdate, uploadKeys } = action.payload;
      const update: UploadStateBranch = {};
      uploadKeys.forEach((key) => {
        update[key] = {
          ...state[key],
          ...metadataUpdate,
        };
      });
      return {
        ...state,
        ...update,
      };
    },
  },
  [UPDATE_UPLOADS]: {
    accepts: (action: AnyAction): action is UpdateUploadAction =>
      action.type === UPDATE_UPLOADS,
    perform: (
      state: UploadStateBranch,
      { payload: { clearAll, upload: replacement } }: UpdateUploadsAction
    ) => (clearAll ? { ...replacement } : { ...state, ...replacement }),
  },
  [REMOVE_FILE_FROM_ARCHIVE]: {
    accepts: (action: AnyAction): action is RemoveFileFromArchiveAction =>
      action.type === REMOVE_FILE_FROM_ARCHIVE,
    perform: (
      state: UploadStateBranch,
      action: RemoveFileFromArchiveAction
    ) => ({
      ...state,
      [action.payload]: {
        ...state[action.payload],
        shouldBeInArchive: false,
      },
    }),
  },
  [REMOVE_FILE_FROM_ISILON]: {
    accepts: (action: AnyAction): action is RemoveFileFromIsilonAction =>
      action.type === REMOVE_FILE_FROM_ISILON,
    perform: (
      state: UploadStateBranch,
      action: RemoveFileFromIsilonAction
    ) => ({
      ...state,
      [action.payload]: {
        ...state[action.payload],
        shouldBeInLocal: false,
      },
    }),
  },
  [REPLACE_UPLOAD]: {
    accepts: (action: AnyAction): action is ReplaceUploadAction =>
      action.type === REPLACE_UPLOAD,
    perform: (
      state: UploadStateBranch,
      { payload: { state: savedState } }: ReplaceUploadAction
    ) => ({
      ...getUpload(savedState),
    }),
  },
  [CLOSE_UPLOAD_TAB]: {
    accepts: (action: AnyAction): action is CloseUploadTabAction =>
      action.type === CLOSE_UPLOAD_TAB,
    perform: () => ({}),
  },
  [SET_APPLIED_TEMPLATE]: {
    accepts: (action: AnyAction): action is SetAppliedTemplateAction =>
      action.type === SET_APPLIED_TEMPLATE,
    perform: (
      state: UploadStateBranch,
      { payload: { uploads } }: SetAppliedTemplateAction
    ) => ({
      ...uploads,
    }),
  },
};

const upload = makeReducer<UploadStateBranch>(actionToConfigMap, initialState);

const options: UndoableOptions = {
  clearHistoryType: CLEAR_UPLOAD_HISTORY,
  filter: getReduxUndoFilterFn([
    INITIATE_UPLOAD,
    JUMP_TO_PAST_UPLOAD,
    JUMP_TO_UPLOAD,
    CLEAR_UPLOAD_HISTORY,
    RETRY_UPLOAD,
  ]),
  initTypes: [RESET_HISTORY],
  jumpToPastType: JUMP_TO_PAST_UPLOAD,
  jumpType: JUMP_TO_UPLOAD,
  limit: 100,
};
export default undoable(upload, options);

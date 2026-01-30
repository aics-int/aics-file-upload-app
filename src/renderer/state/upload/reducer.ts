import { omit } from "lodash";
import { AnyAction } from "redux";
import undoable, { UndoableOptions } from "redux-undo";

import { AnnotationName } from "../../constants";
import { RESET_HISTORY } from "../metadata/constants";
import { RESET_UPLOAD, VIEW_UPLOADS_SUCCEEDED } from "../route/constants";
import { ResetUploadAction, ViewUploadsSucceededAction } from "../route/types";
import { SET_APPLIED_TEMPLATE } from "../template/constants";
import { SetAppliedTemplateAction } from "../template/types";
import { FileModel, TypeToDescriptionMap, UploadStateBranch } from "../types";
import { getReduxUndoFilterFn, makeReducer } from "../util";

import {
  CLEAR_UPLOAD_HISTORY,
  DELETE_UPLOADS,
  INITIATE_UPLOAD,
  JUMP_TO_PAST_UPLOAD,
  JUMP_TO_UPLOAD,
  REPLACE_UPLOAD,
  RETRY_UPLOADS,
  UPDATE_UPLOAD,
  UPDATE_UPLOAD_ROWS,
  UPDATE_UPLOADS,
  ADD_UPLOAD_FILES,
  AUTOFILL_FROM_MXS,
} from "./constants";
import { getUpload } from "./selectors";
import {
  AddUploadFilesAction,
  RemoveUploadsAction,
  ReplaceUploadAction,
  UpdateUploadAction,
  UpdateUploadRowsAction,
  UpdateUploadsAction,
  AutofillFromMXSAction,
} from "./types";

export const initialState = {};

const actionToConfigMap: TypeToDescriptionMap<UploadStateBranch> = {
  [ADD_UPLOAD_FILES]: {
    accepts: (action: AnyAction): action is AddUploadFilesAction =>
      action.type === ADD_UPLOAD_FILES,
    perform: (state: UploadStateBranch, action: AddUploadFilesAction) => {
      return action.payload.reduce(
        (uploads: UploadStateBranch, fileMetadata) => ({
          ...uploads,
          [fileMetadata.file]: fileMetadata,
        }),
        { ...state }
      );
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

      let { upload } = action.payload;
      const modifiedAnnotations = Object.keys(upload);
      // Reset Imaging Session and Well on Plate Barcode changes
      if (modifiedAnnotations.includes(AnnotationName.PLATE_BARCODE)) {
        upload = {
          ...upload,
          [AnnotationName.IMAGING_SESSION]: [],
          [AnnotationName.WELL]: [],
        };
      } else if (modifiedAnnotations.includes(AnnotationName.IMAGING_SESSION)) {
        upload = {
          ...upload,
          [AnnotationName.WELL]: [],
        };
      }

      return {
        ...state,
        [action.payload.key]: {
          ...state[action.payload.key],
          ...upload,
        },
      };
    },
  },
  [UPDATE_UPLOAD_ROWS]: {
    accepts: (action: AnyAction): action is UpdateUploadRowsAction =>
      action.type === UPDATE_UPLOAD_ROWS,
    perform: (state: UploadStateBranch, action: UpdateUploadRowsAction) => {
      const { metadataUpdate, uploadKeys } = action.payload;

      const modifiedAnnotations = Object.keys(metadataUpdate);
      // Reset Imaging Session and Well on Plate Barcode changes
      if (modifiedAnnotations.includes(AnnotationName.PLATE_BARCODE)) {
        metadataUpdate[AnnotationName.IMAGING_SESSION] =
          metadataUpdate[AnnotationName.IMAGING_SESSION] || [];
        metadataUpdate[AnnotationName.WELL] =
          metadataUpdate[AnnotationName.WELL] || [];
      } else if (modifiedAnnotations.includes(AnnotationName.IMAGING_SESSION)) {
        metadataUpdate[AnnotationName.WELL] =
          metadataUpdate[AnnotationName.WELL] || [];
      }

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
      { payload: { clearAll, uploads: replacement } }: UpdateUploadsAction
    ) => (clearAll ? { ...replacement } : { ...state, ...replacement }),
  },
  [REPLACE_UPLOAD]: {
    accepts: (action: AnyAction): action is ReplaceUploadAction =>
      action.type === REPLACE_UPLOAD,
    perform: (
      state: UploadStateBranch,
      { payload: { replacementState } }: ReplaceUploadAction
    ) => ({
      ...getUpload(replacementState),
    }),
  },
  [RESET_UPLOAD]: {
    accepts: (action: AnyAction): action is ResetUploadAction =>
      action.type === RESET_UPLOAD,
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
  [VIEW_UPLOADS_SUCCEEDED]: {
    accepts: (action: AnyAction): action is ViewUploadsSucceededAction =>
      action.type === VIEW_UPLOADS_SUCCEEDED,
    perform: (
      _: UploadStateBranch,
      { payload: { originalUploads } }: ViewUploadsSucceededAction
    ) => ({
      ...originalUploads,
    }),
  },
  [AUTOFILL_FROM_MXS]: {
    accepts: (action: AnyAction): action is AutofillFromMXSAction =>
      action.type === AUTOFILL_FROM_MXS,
    perform: (state: UploadStateBranch, action: AutofillFromMXSAction) => {
      const { filePath, mxsResult } = action.payload;

      if (!state[filePath]) {
        return state;
      }

      const currentUpload = state[filePath];
      const autofillData: Partial<FileModel> = {};
      const autofilledFields: string[] = [];

      Object.entries(mxsResult).forEach(([annotationName, { value }]) => {
        if (value !== null && value !== undefined && value !== "") {
          const currentValue = currentUpload[annotationName];
          const isEmpty =
            currentValue === undefined ||
            currentValue === null ||
            (Array.isArray(currentValue) && currentValue.length === 0);

          if (isEmpty) {
            autofillData[annotationName] = Array.isArray(value)
              ? value
              : [value];
            autofilledFields.push(annotationName);
          }
        }
      });

      if (Object.keys(autofillData).length === 0) {
        return state;
      }

      return {
        ...state,
        [filePath]: {
          ...currentUpload,
          ...autofillData,
          _autofilledFields: [
            ...(currentUpload._autofilledFields || []),
            ...autofilledFields,
          ],
        },
      };
    },
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
    RETRY_UPLOADS,
  ]),
  initTypes: [RESET_HISTORY],
  jumpToPastType: JUMP_TO_PAST_UPLOAD,
  jumpType: JUMP_TO_UPLOAD,
  limit: 100,
};
export default undoable(upload, options);

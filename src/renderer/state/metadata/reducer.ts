import { AnyAction } from "redux";

import {
  VIEW_UPLOADS,
  VIEW_UPLOADS_SUCCEEDED,
  RESET_UPLOAD,
} from "../route/constants";
import {
  ViewUploadsAction,
  ViewUploadsSucceededAction,
  ResetUploadAction,
} from "../route/types";
import { MetadataStateBranch, TypeToDescriptionMap } from "../types";
import { REPLACE_UPLOAD, SAVE_UPLOAD_DRAFT_SUCCESS } from "../upload/constants";
import {
  ReplaceUploadAction,
  SaveUploadDraftSuccessAction,
} from "../upload/types";
import { makeReducer } from "../util";

import {
  CLEAR_OPTIONS_FOR_LOOKUP,
  RECEIVE_ANNOTATION_USAGE,
  RECEIVE_METADATA,
  RESET_HISTORY,
  SET_PLATE_BARCODE_TO_PLATES,
} from "./constants";
import {
  ClearOptionsForLookupAction,
  ReceiveAnnotationUsageAction,
  ReceiveMetadataAction,
  ResetHistoryAction,
  SetPlateBarcodeToPlatesAction,
} from "./types";

export const initialState: MetadataStateBranch = {
  annotationIdToHasBeenUsed: {},
  annotationLookups: [],
  annotationOptions: [],
  annotationTypes: [],
  annotations: [],
  barcodePrefixes: [],
  barcodeSearchResults: [],
  history: {
    upload: {},
  },
  imagingSessions: [],
  lookups: [],
  plateBarcodeToPlates: {},
  templates: [],
  units: [],
  users: [],
};

const actionToConfigMap: TypeToDescriptionMap<MetadataStateBranch> = {
  [CLEAR_OPTIONS_FOR_LOOKUP]: {
    accepts: (action: AnyAction): action is ClearOptionsForLookupAction =>
      action.type === CLEAR_OPTIONS_FOR_LOOKUP,
    perform: (
      state: MetadataStateBranch,
      action: ClearOptionsForLookupAction
    ) => ({ ...state, [action.payload]: [] }),
  },
  [RECEIVE_METADATA]: {
    accepts: (action: AnyAction): action is ReceiveMetadataAction =>
      action.type === RECEIVE_METADATA,
    perform: (
      state: MetadataStateBranch,
      { payload: { metadata } }: ReceiveMetadataAction
    ) => ({
      ...state,
      ...metadata,
    }),
  },
  [RECEIVE_ANNOTATION_USAGE]: {
    accepts: (action: AnyAction): action is ReceiveAnnotationUsageAction =>
      action.type === RECEIVE_ANNOTATION_USAGE,
    perform: (
      state: MetadataStateBranch,
      { payload }: ReceiveAnnotationUsageAction
    ) => ({
      ...state,
      annotationIdToHasBeenUsed: {
        ...state.annotationIdToHasBeenUsed,
        [payload.annotationId]: payload.hasAnnotationValues,
      },
    }),
  },
  [RESET_HISTORY]: {
    accepts: (action: AnyAction): action is ResetHistoryAction =>
      action.type === RESET_HISTORY,
    perform: (state: MetadataStateBranch) => ({
      ...state,
      history: {
        upload: {},
      },
    }),
  },
  [REPLACE_UPLOAD]: {
    accepts: (action: AnyAction): action is ReplaceUploadAction =>
      action.type === REPLACE_UPLOAD,
    perform: (state: MetadataStateBranch, action: ReplaceUploadAction) => ({
      ...state,
      currentUploadFilePath: action.payload.filePath,
    }),
  },
  [RESET_UPLOAD]: {
    accepts: (action: AnyAction): action is ResetUploadAction =>
      action.type === RESET_UPLOAD,
    perform: (state: MetadataStateBranch) => ({
      ...state,
      currentUploadFilePath: undefined,
      originalUpload: undefined,
    }),
  },
  [SET_PLATE_BARCODE_TO_PLATES]: {
    accepts: (action: AnyAction): action is SetPlateBarcodeToPlatesAction =>
      action.type === SET_PLATE_BARCODE_TO_PLATES,
    perform: (
      state: MetadataStateBranch,
      action: SetPlateBarcodeToPlatesAction
    ) => ({
      ...state,
      plateBarcodeToPlates: action.payload,
    }),
  },
  // this is necessary because we are sharing the upload tab
  [VIEW_UPLOADS]: {
    accepts: (action: AnyAction): action is ViewUploadsAction =>
      action.type === VIEW_UPLOADS,
    perform: (state: MetadataStateBranch) => ({
      ...state,
      currentUploadFilePath: undefined,
    }),
  },
  [VIEW_UPLOADS_SUCCEEDED]: {
    accepts: (action: AnyAction): action is ViewUploadsSucceededAction =>
      action.type === VIEW_UPLOADS_SUCCEEDED,
    perform: (
      state: MetadataStateBranch,
      { payload: { originalUploads } }: ViewUploadsSucceededAction
    ) => ({
      ...state,
      originalUploads,
    }),
  },
  [SAVE_UPLOAD_DRAFT_SUCCESS]: {
    accepts: (action: AnyAction): action is SaveUploadDraftSuccessAction =>
      action.type === SAVE_UPLOAD_DRAFT_SUCCESS,
    perform: (
      state: MetadataStateBranch,
      action: SaveUploadDraftSuccessAction
    ) => ({
      ...state,
      currentUploadFilePath: action.payload,
    }),
  },
};

export default makeReducer<MetadataStateBranch>(
  actionToConfigMap,
  initialState
);

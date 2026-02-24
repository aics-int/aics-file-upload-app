import { createLogic } from "redux-logic";

import {
  fetchMetadataSucceeded,
  fetchMetadataFailed,
  fetchMetadataRequest,
  FetchMetadataRequestAction,
  FetchMetadataSucceededAction,
} from "../metadataExtraction/actions";
import {
  FETCH_METADATA_REQUEST,
  FETCH_METADATA_SUCCEEDED,
} from "../metadataExtraction/constants";
import { SET_APPLIED_TEMPLATE } from "../template/constants";
import { SetAppliedTemplateAction } from "../template/types";
import {
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicNextCb,
  ReduxLogicDoneCb,
  State,
} from "../types";
import { autofillFromMXS } from "../upload/actions";
import { ADD_UPLOAD_FILES } from "../upload/constants";
import { AddUploadFilesAction } from "../upload/types";

// fetches MXS data and stores in metadataExtraction state
const fetchMetadataLogic = createLogic({
  process: async (
    {
      action,
      mxsClient,
    }: ReduxLogicProcessDependenciesWithAction<FetchMetadataRequestAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { filePath } = action.payload;
    try {
      const metadata = await mxsClient.fetchExtractedMetadata(filePath);
      dispatch(fetchMetadataSucceeded(filePath, metadata));
    } catch (error) {
      dispatch(fetchMetadataFailed(filePath, error));
    }
    done();
  },
  type: FETCH_METADATA_REQUEST,
});

// fetch MXS data when files are added (store for later use)
const autoFetchMetadataOnAddFilesLogic = createLogic({
  process: async (
    { action }: ReduxLogicProcessDependenciesWithAction<AddUploadFilesAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    for (const fileModel of action.payload) {
      dispatch(fetchMetadataRequest(fileModel.file));
    }
    done();
  },
  type: ADD_UPLOAD_FILES,
});

// autofill from cached metadataExtraction state when template is selected
const autofillOnTemplateAppliedLogic = createLogic({
  process: async (
    {
      action,
      getState,
    }: ReduxLogicProcessDependenciesWithAction<SetAppliedTemplateAction> & {
      getState: () => State;
    },
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const state = getState();
    const uploads = action.payload?.uploads;
    if (!uploads) {
      done();
      return;
    }

    for (const filePath of Object.keys(uploads)) {
      const cachedMetadata = state.metadataExtraction[filePath]?.metadata;
      if (cachedMetadata) {
        dispatch(autofillFromMXS(filePath, cachedMetadata));
      }
    }
    done();
  },
  type: SET_APPLIED_TEMPLATE,
});

// autofill when metadata arrives after a template has already been applied
const autofillOnMetadataArrivedLogic = createLogic({
  process: async (
    {
      action,
      getState,
    }: ReduxLogicProcessDependenciesWithAction<FetchMetadataSucceededAction> & {
      getState: () => State;
    },
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const state = getState();
    const appliedTemplate = state.template.appliedTemplate;
    if (!appliedTemplate) {
      done();
      return;
    }

    const { filePath, metadata } = action.payload;
    const uploads = state.upload.present;
    if (uploads[filePath]) {
      dispatch(autofillFromMXS(filePath, metadata));
    }
    done();
  },
  type: FETCH_METADATA_SUCCEEDED,
});

export default [
  fetchMetadataLogic,
  autoFetchMetadataOnAddFilesLogic,
  autofillOnTemplateAppliedLogic,
  autofillOnMetadataArrivedLogic,
];

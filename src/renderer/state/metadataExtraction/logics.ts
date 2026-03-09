import { createLogic } from "redux-logic";

import {
  fetchMetadataSucceeded,
  fetchMetadataFailed,
  FetchMetadataRequestAction,
} from "../metadataExtraction/actions";
import { FETCH_METADATA_REQUEST } from "../metadataExtraction/constants";
import { SET_APPLIED_TEMPLATE } from "../template/constants";
import { SetAppliedTemplateAction } from "../template/types";
import {
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicNextCb,
  ReduxLogicDoneCb,
  State,
} from "../types";
import { autofillFromMXS } from "../upload/actions";

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

export default [fetchMetadataLogic, autofillOnTemplateAppliedLogic];

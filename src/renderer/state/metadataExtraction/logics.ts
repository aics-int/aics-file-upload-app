import { createLogic } from "redux-logic";

import {
  fetchMetadataSucceeded,
  fetchMetadataFailed,
  fetchMetadataRequest,
  FetchMetadataRequestAction,
} from "../metadataExtraction/actions";
import { FETCH_METADATA_REQUEST } from "../metadataExtraction/constants";
import { SET_APPLIED_TEMPLATE } from "../template/constants";
import { SetAppliedTemplateAction } from "../template/types";
import {
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicNextCb,
  ReduxLogicDoneCb,
} from "../types";
import { autofillFromMXS } from "../upload/actions";

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
      dispatch(autofillFromMXS(filePath, metadata));
    } catch (error) {
      dispatch(fetchMetadataFailed(filePath, error));
    }
    done();
  },
  type: FETCH_METADATA_REQUEST,
});

const autoFetchMetadataOnTemplateAppliedLogic = createLogic({
  process: async (
    {
      action,
    }: ReduxLogicProcessDependenciesWithAction<SetAppliedTemplateAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const payload = action.payload;
    if (!payload || !payload.uploads) {
      done();
      return;
    }

    const uploads = payload.uploads;
    const filePaths = Object.keys(uploads);

    for (let i = 0; i < filePaths.length; i++) {
      dispatch(fetchMetadataRequest(filePaths[i]));
    }
    done();
  },
  type: SET_APPLIED_TEMPLATE,
});

export default [fetchMetadataLogic, autoFetchMetadataOnTemplateAppliedLogic];

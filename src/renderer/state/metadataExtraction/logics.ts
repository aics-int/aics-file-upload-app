import { createLogic } from "redux-logic";

import {
  fetchMetadataSucceeded,
  fetchMetadataFailed,
} from "../metadataExtraction/actions";
import { FetchMetadataRequestAction } from "../metadataExtraction/actions";
import { FETCH_METADATA_REQUEST } from "../metadataExtraction/constants";
import {
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicNextCb,
  ReduxLogicDoneCb,
} from "../types";

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

export default [fetchMetadataLogic];

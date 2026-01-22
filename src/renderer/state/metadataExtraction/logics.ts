import { createLogic } from "redux-logic";

import {
  fetchMetadataSucceeded,
  fetchMetadataFailed,
  fetchMetadataRequest,
} from "../metadataExtraction/actions";
import { FetchMetadataRequestAction } from "../metadataExtraction/actions";
import { FETCH_METADATA_REQUEST } from "../metadataExtraction/constants";
import {
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicNextCb,
  ReduxLogicDoneCb,
} from "../types";
import { autofillFromMXS } from "../upload/actions";
import { ADD_UPLOAD_FILES } from "../upload/constants";
import { AddUploadFilesAction } from "../upload/types";

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
      // Autofill the upload row with the extracted metadata
      dispatch(autofillFromMXS(filePath, metadata));
    } catch (error) {
      dispatch(fetchMetadataFailed(filePath, error));
    }
    done();
  },
  type: FETCH_METADATA_REQUEST,
});

// NEW: Automatically fetch MXS metadata when files are added
const autoFetchMetadataOnAddFilesLogic = createLogic({
  process: async (
    { action }: ReduxLogicProcessDependenciesWithAction<AddUploadFilesAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    // Dispatch fetch requests for each added file
    for (const fileModel of action.payload) {
      dispatch(fetchMetadataRequest(fileModel.file));
    }
    done();
  },
  type: ADD_UPLOAD_FILES,
});

export default [fetchMetadataLogic, autoFetchMetadataOnAddFilesLogic];

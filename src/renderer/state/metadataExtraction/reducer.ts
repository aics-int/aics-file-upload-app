import { AnyAction } from "redux";

import {
  FETCH_METADATA_REQUEST,
  FETCH_METADATA_SUCCEEDED,
  FETCH_METADATA_FAILED,
} from "../metadataExtraction/constants";
import type { MetadataExtractionState } from "../metadataExtraction/types";

export const initialState: MetadataExtractionState = {};

export default function reducer(
  state = initialState,
  action: AnyAction
): MetadataExtractionState {
  switch (action.type) {
    case FETCH_METADATA_REQUEST: {
      const { filePath } = action.payload;
      return {
        ...state,
        [filePath]: { loading: true },
      };
    }
    case FETCH_METADATA_SUCCEEDED: {
      const { filePath, metadata } = action.payload;
      return {
        ...state,
        [filePath]: { loading: false, metadata },
      };
    }
    case FETCH_METADATA_FAILED: {
      const { filePath, error } = action.payload;
      return {
        ...state,
        [filePath]: { loading: false, error: error.message || String(error) },
      };
    }
    default:
      return state;
  }
}

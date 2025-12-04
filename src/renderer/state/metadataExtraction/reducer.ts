import { AnyAction } from "redux";

import { MXSResult } from "../../services/metadata-extraction-service";
import {
  FETCH_METADATA_REQUEST,
  FETCH_METADATA_SUCCEEDED,
  FETCH_METADATA_FAILED,
} from "../metadataExtraction/constants";

interface FileMetadataState {
  [filePath: string]: {
    loading: boolean;
    metadata?: MXSResult;
    error?: string;
  };
}

export type MetadataExtractionState = FileMetadataState;

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

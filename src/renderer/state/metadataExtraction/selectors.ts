import { MetadataExtractionState } from "../metadataExtraction/types";
import { State } from "../types";

export const getMetadataExtractionState = (
  state: State
): MetadataExtractionState => state.metadataExtraction || {};

export const getMetadataForFile = (state: State, filePath: string) =>
  getMetadataExtractionState(state)[filePath] || { loading: false };

export const getIsAnyMetadataExtractionLoading = (state: State): boolean =>
  Object.values(getMetadataExtractionState(state)).some((file) => file.loading);

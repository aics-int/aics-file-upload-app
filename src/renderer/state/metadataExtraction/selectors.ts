import { State } from "../types";

import { MetadataExtractionState } from "./reducer";

export const getMetadataExtractionState = (
  state: State
): MetadataExtractionState => state.metadataExtraction || {};

export const getMetadataForFile = (state: State, filePath: string) =>
  getMetadataExtractionState(state)[filePath] || { loading: false };

import { MXSResult } from "../../services/metadata-extraction-service";

interface FileMetadataState {
  [filePath: string]: {
    loading: boolean;
    metadata?: MXSResult;
    error?: string;
  };
}

export type MetadataExtractionState = FileMetadataState;

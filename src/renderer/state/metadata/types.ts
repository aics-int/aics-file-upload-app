import { BarcodePrefix,
  AnnotationOption,
} from "../../services/labkey-client/types";

import {
  AsyncRequest,
  MetadataStateBranch,
  PlateBarcodeToPlates,
} from "../types";

import { RECEIVE_PROGRAM_OPTIONS } from "./constants";

export interface GetOptionsForLookupAction {
  payload: {
    lookupAnnotationName: string;
    searchStr?: string;
  };
  type: string;
}

export interface ClearOptionsForLookupAction {
  payload: keyof MetadataStateBranch; // lookupAnnotationName
  type: string;
}

export interface ReceiveMetadataAction {
  payload: {
    metadata: Partial<MetadataStateBranch>;
    requestType: AsyncRequest | string;
  };
  type: string;
}

export interface RequestMetadataAction {
  type: string;
}

export interface RequestAnnotationUsage {
  payload: number;
  type: string;
}

export interface ReceiveAnnotationUsageAction {
  payload: {
    annotationId: number;
    hasAnnotationValues: boolean;
  };
  type: string;
}

export interface CreateBarcodeAction {
  payload: { barcodePrefix: BarcodePrefix; uploadKey: string };
  type: string;
}

export interface GetBarcodeSearchResultsAction {
  payload: string;
  type: string;
}

export interface GetTemplatesAction {
  type: string;
}

export interface ResetHistoryAction {
  type: string;
}

export interface SetPlateBarcodeToPlatesAction {
  payload: PlateBarcodeToPlates;
  type: string;
}

export interface ReceiveProgramOptionsAction {
  type: typeof RECEIVE_PROGRAM_OPTIONS;
  payload: AnnotationOption[];
}

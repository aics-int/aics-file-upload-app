import { 
  BarcodePrefix, 
  AnnotationOption 
} from "../../services/labkey-client/types";
import {
  AsyncRequest,
  MetadataStateBranch,
  PlateBarcodeToPlates,
} from "../types";

import {
  CLEAR_OPTIONS_FOR_LOOKUP,
  CREATE_BARCODE,
  GET_BARCODE_SEARCH_RESULTS,
  GET_OPTIONS_FOR_LOOKUP,
  GET_TEMPLATES,
  RECEIVE_ANNOTATION_USAGE,
  RECEIVE_METADATA,
  REQUEST_ANNOTATION_USAGE,
  REQUEST_METADATA,
  RESET_HISTORY,
  SET_PLATE_BARCODE_TO_PLATES,
  GET_PROGRAM_OPTIONS,
  RECEIVE_PROGRAM_OPTIONS,
} from "./constants";
import { initialState } from "./reducer";
import {
  ClearOptionsForLookupAction,
  CreateBarcodeAction,
  GetBarcodeSearchResultsAction,
  GetOptionsForLookupAction,
  GetTemplatesAction,
  ReceiveAnnotationUsageAction,
  ReceiveMetadataAction,
  RequestAnnotationUsage,
  RequestMetadataAction,
  ResetHistoryAction,
  SetPlateBarcodeToPlatesAction,
} from "./types";

export function requestAnnotationUsage(
  annotationId: number
): RequestAnnotationUsage {
  return {
    payload: annotationId,
    type: REQUEST_ANNOTATION_USAGE,
  };
}

export function receiveAnnotationUsage(
  annotationId: number,
  hasAnnotationValues: boolean
): ReceiveAnnotationUsageAction {
  return {
    payload: {
      annotationId,
      hasAnnotationValues,
    },
    type: RECEIVE_ANNOTATION_USAGE,
  };
}

export function clearOptionsForLookup(
  lookupAnnotationName: keyof MetadataStateBranch
): ClearOptionsForLookupAction {
  return {
    payload: lookupAnnotationName,
    type: CLEAR_OPTIONS_FOR_LOOKUP,
  };
}

export function retrieveOptionsForLookup(
  lookupAnnotationName: string,
  searchStr?: string
): GetOptionsForLookupAction {
  return {
    payload: {
      lookupAnnotationName,
      searchStr,
    },
    type: GET_OPTIONS_FOR_LOOKUP,
  };
}

export function receiveMetadata(
  metadata: Partial<MetadataStateBranch> = initialState,
  requestType: AsyncRequest | string = AsyncRequest.GET_METADATA
): ReceiveMetadataAction {
  return {
    payload: {
      metadata,
      requestType,
    },
    type: RECEIVE_METADATA,
  };
}

export function requestMetadata(): RequestMetadataAction {
  return {
    type: REQUEST_METADATA,
  };
}

export function requestBarcodeSearchResults(
  searchStr: string
): GetBarcodeSearchResultsAction {
  return {
    payload: searchStr,
    type: GET_BARCODE_SEARCH_RESULTS,
  };
}

export function setPlateBarcodeToPlates(
  plateBarcodeToPlates: PlateBarcodeToPlates
): SetPlateBarcodeToPlatesAction {
  return {
    payload: plateBarcodeToPlates,
    type: SET_PLATE_BARCODE_TO_PLATES,
  };
}

export function requestTemplates(): GetTemplatesAction {
  return {
    type: GET_TEMPLATES,
  };
}

export function createBarcode(
  barcodePrefix: BarcodePrefix,
  uploadKey: string
): CreateBarcodeAction {
  return {
    payload: { barcodePrefix, uploadKey },
    type: CREATE_BARCODE,
  };
}

export function resetHistory(): ResetHistoryAction {
  return {
    type: RESET_HISTORY,
  };
}

export function requestProgramOptions() {
  return {
    type: GET_PROGRAM_OPTIONS,
  };
}

export function receiveProgramOptions(options: AnnotationOption[]) {
  return {
    type: RECEIVE_PROGRAM_OPTIONS,
    payload: options,
  };
}

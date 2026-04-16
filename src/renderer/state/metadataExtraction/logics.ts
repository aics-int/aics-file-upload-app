import { createLogic } from "redux-logic";

import { DAY_AS_MS, HOUR_AS_MS, MINUTE_AS_MS } from "../../constants";
import { Duration } from "../../types";
import { getDurationAnnotationTypeId } from "../metadata/selectors";
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
  State,
} from "../types";
import { autofillFromMXS } from "../upload/actions";
import { ADD_UPLOAD_FILES } from "../upload/constants";
import { AddUploadFilesAction } from "../upload/types";

export function msToDuration(ms: number): Duration {
  let remaining = ms;
  const days = Math.floor(remaining / DAY_AS_MS);
  remaining -= days * DAY_AS_MS;
  const hours = Math.floor(remaining / HOUR_AS_MS);
  remaining -= hours * HOUR_AS_MS;
  const minutes = Math.floor(remaining / MINUTE_AS_MS);
  remaining -= minutes * MINUTE_AS_MS;
  const seconds = Math.floor(remaining / 1000);
  return { days, hours, minutes, seconds };
}

// fetches MXS data and stores in metadataExtraction state
const fetchMetadataLogic = createLogic({
  process: async (
    {
      action,
      fms,
      mxsClient,
    }: ReduxLogicProcessDependenciesWithAction<FetchMetadataRequestAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { filePath } = action.payload;
    try {
      const posixPath = fms.posixPath(filePath);
      const metadata = await mxsClient.fetchExtractedMetadata(posixPath);
      dispatch(fetchMetadataSucceeded(filePath, metadata));
    } catch (error) {
      dispatch(fetchMetadataFailed(filePath, error));
    }
    done();
  },
  type: FETCH_METADATA_REQUEST,
});

// fetch MXS data when files are added (store for later use)
const autoFetchMetadataOnAddFilesLogic = createLogic({
  process: async (
    { action }: ReduxLogicProcessDependenciesWithAction<AddUploadFilesAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    for (const fileModel of action.payload) {
      dispatch(fetchMetadataRequest(fileModel.file));
    }
    done();
  },
  type: ADD_UPLOAD_FILES,
});

// autofill from cached metadataExtraction state when template is selected
const autofillOnTemplateAppliedLogic = createLogic({
  process: async (
    {
      action,
      getState,
    }: ReduxLogicProcessDependenciesWithAction<SetAppliedTemplateAction> & {
      getState: () => State;
    },
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const state = getState();
    const uploads = action.payload?.uploads;
    const template = action.payload?.template;
    if (!uploads) {
      done();
      return;
    }

    const durationTypeId = getDurationAnnotationTypeId(state);
    const durationAnnotationNames = new Set(
      (template?.annotations || [])
        .filter((a) => a.annotationTypeId === durationTypeId)
        .map((a) => a.name)
    );

    for (const filePath of Object.keys(uploads)) {
      const cachedMetadata = state.metadataExtraction[filePath]?.metadata;
      if (cachedMetadata) {
        // sometimes metadata from mxs needs to be converted into a format
        // we can render in the ui, do these conversions here
        const convertedMetadata: Record<string, any> = { ...cachedMetadata };
        // convert durations
        for (const name of durationAnnotationNames) {
          const entry = convertedMetadata[name];
          if (entry) {
            convertedMetadata[name] = {
              ...entry,
              value: msToDuration(entry.value as number),
            };
          }
        }
        dispatch(autofillFromMXS(filePath, convertedMetadata));
      }
    }
    done();
  },
  type: SET_APPLIED_TEMPLATE,
});

export default [
  fetchMetadataLogic,
  autoFetchMetadataOnAddFilesLogic,
  autofillOnTemplateAppliedLogic,
];

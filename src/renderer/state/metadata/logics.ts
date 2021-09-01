import { isEmpty, trim } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import { OPEN_CREATE_PLATE_STANDALONE } from "../../../shared/constants";
import {
  Annotation,
  AnnotationLookup,
  Lookup,
} from "../../services/labkey-client/types";
import { requestFailed } from "../actions";
import { setAlert, setErrorAlert } from "../feedback/actions";
import { getWithRetry } from "../stateHelpers";
import {
  AlertType,
  AsyncRequest,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
} from "../types";

import { receiveAnnotationUsage, receiveMetadata } from "./actions";
import {
  CREATE_BARCODE,
  GET_BARCODE_SEARCH_RESULTS,
  GET_OPTIONS_FOR_LOOKUP,
  GET_TEMPLATES,
  REQUEST_ANNOTATION_USAGE,
  REQUEST_METADATA,
} from "./constants";
import { getAnnotationLookups, getAnnotations, getLookups } from "./selectors";
import {
  CreateBarcodeAction,
  GetOptionsForLookupAction,
  RequestAnnotationUsage,
} from "./types";

const createBarcodeLogic = createLogic({
  process: async (
    {
      action,
      getState,
      ipcRenderer,
      logger,
      mmsClient,
    }: ReduxLogicProcessDependenciesWithAction<CreateBarcodeAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    try {
      const {
        setting: { limsHost, limsPort },
      } = getState();
      const {
        barcodePrefix: { prefixId, prefix },
        uploadKey,
      } = action.payload;
      const barcode = await mmsClient.createBarcode(prefixId);
      ipcRenderer.send(
        OPEN_CREATE_PLATE_STANDALONE,
        limsHost,
        limsPort,
        barcode,
        prefix,
        uploadKey
      );
    } catch (ex) {
      const error = "Could not create barcode: " + ex.message;
      logger.error(error);
      dispatch(
        setAlert({
          type: AlertType.ERROR,
          message: error,
        })
      );
    }
    done();
  },
  type: CREATE_BARCODE,
});

const requestMetadataLogic = createLogic({
  process: async (
    { labkeyClient, logger }: ReduxLogicProcessDependencies,
    dispatch: (action: AnyAction) => void,
    done: () => void
  ) => {
    try {
      const request = () =>
        Promise.all([
          labkeyClient.getAnnotations(),
          labkeyClient.getAnnotationOptions(),
          labkeyClient.getAnnotationLookups(),
          labkeyClient.getAnnotationTypes(),
          labkeyClient.getBarcodePrefixes(),
          labkeyClient.getChannels(),
          labkeyClient.getImagingSessions(),
          labkeyClient.getLookups(),
          labkeyClient.getUnits(),
          labkeyClient.getUsers(),
        ]);
      const [
        annotations,
        annotationOptions,
        annotationLookups,
        annotationTypes,
        barcodePrefixes,
        channels,
        imagingSessions,
        lookups,
        units,
        users,
      ] = await getWithRetry(request, dispatch);
      dispatch(
        receiveMetadata({
          annotations,
          annotationOptions,
          annotationLookups,
          annotationTypes,
          barcodePrefixes,
          channels,
          imagingSessions,
          lookups,
          units,
          users,
        })
      );
    } catch (e) {
      logger.error(e.message);
      dispatch(
        requestFailed(
          `Failed to retrieve metadata: ${e.message}`,
          AsyncRequest.GET_METADATA
        )
      );
    }
    done();
  },
  type: REQUEST_METADATA,
});

const requestAnnotationUsageLogic = createLogic({
  process: async (
    {
      action,
      labkeyClient,
    }: ReduxLogicProcessDependenciesWithAction<RequestAnnotationUsage>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    try {
      const hasAnnotationValues = await labkeyClient.checkForAnnotationValues(
        action.payload
      );
      dispatch(receiveAnnotationUsage(action.payload, hasAnnotationValues));
    } catch (e) {
      const error = `Failed to determine if annotation has been used: ${e.message}`;
      dispatch(requestFailed(error, AsyncRequest.REQUEST_ANNOTATION_USAGE));
    }
    done();
  },
  type: REQUEST_ANNOTATION_USAGE,
});

const getBarcodeSearchResultsLogic = createLogic({
  debounce: 500,
  latest: true,
  process: async (
    { action, labkeyClient, logger }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { payload: searchStr } = action;
    const request = () => labkeyClient.getPlatesByBarcode(searchStr);

    try {
      const barcodeSearchResults = await getWithRetry(request, dispatch);
      dispatch(
        receiveMetadata(
          { barcodeSearchResults },
          AsyncRequest.GET_BARCODE_SEARCH_RESULTS
        )
      );
    } catch (e) {
      const error = `Could not retrieve barcode search results: ${e.message}`;
      logger.error(error);
      dispatch(requestFailed(error, AsyncRequest.GET_BARCODE_SEARCH_RESULTS));
    }
    done();
  },
  type: GET_BARCODE_SEARCH_RESULTS,
  validate: (
    { action }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { payload } = action;
    const searchStr = trim(payload);
    if (!searchStr) {
      // Redux logic types don't allow undefined as an argument
      reject({ type: "ignore" });
    } else {
      next({
        ...action,
        payload: searchStr,
      });
    }
  },
});

const requestOptionsForLookupLogic = createLogic({
  debounce: 500,
  latest: true,
  process: async (
    {
      action: { payload },
      getState,
      labkeyClient,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<GetOptionsForLookupAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { lookupAnnotationName, searchStr } = payload;
    const state = getState();
    const annotations = getAnnotations(state);
    const annotationLookups = getAnnotationLookups(state);
    const lookups = getLookups(state);
    let lookup: Lookup | undefined;

    const annotation: Annotation | undefined = annotations.find(
      ({ name }) => name.toLowerCase() === lookupAnnotationName.toLowerCase()
    );
    if (annotation) {
      const annotationLookup:
        | AnnotationLookup
        | undefined = annotationLookups.find(
        (al) => al.annotationId === annotation.annotationId
      );
      if (annotationLookup) {
        lookup = lookups.find(
          ({ lookupId }) => lookupId === annotationLookup.lookupId
        );
      }
    }

    if (!lookup) {
      dispatch(
        requestFailed(
          "Could not retrieve options for lookup: could not find lookup. Contact Software.",
          AsyncRequest.GET_OPTIONS_FOR_LOOKUP
        )
      );
      done();
      return;
    }

    const { columnName, schemaName, tableName } = lookup;
    try {
      const optionsForLookup = await getWithRetry(
        () =>
          labkeyClient.getOptionsForLookup(
            schemaName,
            tableName,
            columnName,
            searchStr
          ),
        dispatch
      );
      dispatch(
        receiveMetadata(
          { [lookupAnnotationName]: optionsForLookup },
          AsyncRequest.GET_OPTIONS_FOR_LOOKUP
        )
      );
    } catch (e) {
      const error = `Could not retrieve options for lookup annotation: ${e.message}`;
      logger.error(error);
      dispatch(requestFailed(error, AsyncRequest.GET_OPTIONS_FOR_LOOKUP));
    }
    done();
  },
  type: GET_OPTIONS_FOR_LOOKUP,
  validate: (
    { action }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { lookupAnnotationName } = action.payload;

    if (isEmpty(lookupAnnotationName)) {
      reject(
        setErrorAlert(
          "Cannot retrieve options for lookup when lookupAnnotationName is not defined. Contact Software."
        )
      );
      return;
    }

    next(action);
  },
});

const requestTemplatesLogicLogic = createLogic({
  process: async (
    { labkeyClient, logger }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    try {
      const templates = await getWithRetry(
        () => labkeyClient.getTemplates(),
        dispatch
      );
      dispatch(receiveMetadata({ templates }, AsyncRequest.GET_TEMPLATES));
    } catch (e) {
      const error = `Could not retrieve templates: ${e.message}`;
      logger.error(error);
      dispatch(requestFailed(error, AsyncRequest.GET_TEMPLATES));
    }
    done();
  },
  type: GET_TEMPLATES,
});

export default [
  createBarcodeLogic,
  getBarcodeSearchResultsLogic,
  requestAnnotationUsageLogic,
  requestMetadataLogic,
  requestOptionsForLookupLogic,
  requestTemplatesLogicLogic,
];

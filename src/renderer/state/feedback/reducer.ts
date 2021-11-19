import { uniq, without } from "lodash";
import { AnyAction } from "redux";

import { OPEN_TEMPLATE_MENU_ITEM_CLICKED } from "../../../shared/constants";
import { REQUEST_FAILED } from "../constants";
import {
  RECEIVE_FSS_JOB_COMPLETION_UPDATE,
  RECEIVE_JOBS,
} from "../job/constants";
import {
  ReceiveFSSJobCompletionUpdateAction,
  ReceiveJobsAction,
} from "../job/types";
import {
  GET_BARCODE_SEARCH_RESULTS,
  GET_OPTIONS_FOR_LOOKUP,
  GET_TEMPLATES,
  RECEIVE_ANNOTATION_USAGE,
  RECEIVE_METADATA,
  REQUEST_ANNOTATION_USAGE,
  REQUEST_METADATA,
} from "../metadata/constants";
import {
  GetBarcodeSearchResultsAction,
  GetOptionsForLookupAction,
  GetTemplatesAction,
  ReceiveAnnotationUsageAction,
  ReceiveMetadataAction,
  RequestAnnotationUsage,
  RequestMetadataAction,
} from "../metadata/types";
import {
  VIEW_UPLOADS,
  VIEW_UPLOADS_SUCCEEDED,
  RESET_UPLOAD,
} from "../route/constants";
import {
  ViewUploadsAction,
  ViewUploadsSucceededAction,
  ResetUploadAction,
} from "../route/types";
import { clearTemplateDraft } from "../template/actions";
import {
  CREATE_ANNOTATION,
  EDIT_ANNOTATION,
  SAVE_TEMPLATE,
  SAVE_TEMPLATE_SUCCEEDED,
  SET_APPLIED_TEMPLATE,
  START_TEMPLATE_DRAFT,
  START_TEMPLATE_DRAFT_FAILED,
} from "../template/constants";
import {
  CreateAnnotationAction,
  EditAnnotationAction,
  SaveTemplateAction,
  SaveTemplateSucceededAction,
  SetAppliedTemplateAction,
  StartTemplateDraftAction,
  StartTemplateDraftFailedAction,
} from "../template/types";
import {
  AlertType,
  AppEvent,
  AsyncRequest,
  FeedbackStateBranch,
  HTTP_STATUS,
  RequestFailedAction,
  TutorialStep,
  TypeToDescriptionMap,
} from "../types";
import {
  APPLY_TEMPLATE,
  CANCEL_UPLOADS,
  CANCEL_UPLOAD_FAILED,
  CANCEL_UPLOAD_SUCCEEDED,
  EDIT_FILE_METADATA_FAILED,
  EDIT_FILE_METADATA_SUCCEEDED,
  INITIATE_UPLOAD,
  INITIATE_UPLOAD_FAILED,
  INITIATE_UPLOAD_SUCCEEDED,
  RETRY_UPLOADS,
  SUBMIT_FILE_METADATA_UPDATE,
  UPLOAD_FAILED,
  UPLOAD_SUCCEEDED,
} from "../upload/constants";
import {
  ApplyTemplateAction,
  CancelUploadAction,
  CancelUploadFailedAction,
  CancelUploadSucceededAction,
  EditFileMetadataFailedAction,
  EditFileMetadataSucceededAction,
  InitiateUploadAction,
  InitiateUploadFailedAction,
  InitiateUploadSucceededAction,
  SubmitFileMetadataUpdateAction,
  RetryUploadAction,
  UploadFailedAction,
  UploadSucceededAction,
} from "../upload/types";
import { makeReducer } from "../util";

import {
  ADD_EVENT,
  ADD_REQUEST_IN_PROGRESS,
  CLEAR_ALERT,
  CLEAR_DEFERRED_ACTION,
  CLEAR_UPLOAD_ERROR,
  CLOSE_MODAL,
  CLOSE_NOTIFICATION_CENTER,
  CLOSE_SET_MOUNT_POINT_NOTIFICATION,
  OPEN_MODAL,
  OPEN_SET_MOUNT_POINT_NOTIFICATION,
  REMOVE_REQUEST_IN_PROGRESS,
  SET_ALERT,
  SET_DEFERRED_ACTION,
  SET_TUTORIAL_TOOLTIP_STEP,
  START_LOADING,
  STOP_LOADING,
} from "./constants";
import {
  AddEventAction,
  AddRequestInProgressAction,
  ClearAlertAction,
  ClearDeferredAction,
  ClearUploadErrorAction,
  CloseModalAction,
  CloseNotificationCenter,
  CloseSetMountPointNotificationAction,
  OpenModalAction,
  OpenSetMountPointNotificationAction,
  OpenTemplateEditorAction,
  RemoveRequestInProgressAction,
  SetAlertAction,
  SetDeferredActionAction,
  SetTutorialTooltipStep,
  StartLoadingAction,
  StopLoadingAction,
} from "./types";

const BAD_GATEWAY_ERROR = "Bad Gateway Error: Labkey or MMS is down.";
const addRequestToInProgress = (
  state: FeedbackStateBranch,
  request: AsyncRequest | string
) => uniq([...state.requestsInProgress, request]);
const removeRequestFromInProgress = (
  state: FeedbackStateBranch,
  request: AsyncRequest | string
) => without(state.requestsInProgress, request);
const getInfoAlert = (message: string) => ({
  message,
  type: AlertType.INFO,
});
const getSuccessAlert = (message: string) => ({
  message,
  type: AlertType.SUCCESS,
});
const getErrorAlert = (message: string) => ({
  message,
  type: AlertType.ERROR,
});

export const initialState: FeedbackStateBranch = {
  deferredAction: undefined,
  events: [],
  isLoading: false,
  requestsInProgress: [],
  setMountPointNotificationVisible: false,
  tutorialTooltip: TutorialStep.MASS_EDIT,
  uploadError: undefined,
  visibleModals: [],
};

const actionToConfigMap: TypeToDescriptionMap<FeedbackStateBranch> = {
  [CLEAR_ALERT]: {
    accepts: (action: AnyAction): action is ClearAlertAction =>
      action.type === CLEAR_ALERT,
    perform: (state: FeedbackStateBranch) => {
      const { alert } = state;
      if (!alert) {
        return state;
      }

      const { message, type } = alert;
      const event: AppEvent = {
        date: new Date(),
        message: message ?? "",
        type,
        viewed: false,
      };
      return {
        ...state,
        alert: undefined,
        events: [...state.events, event],
      };
    },
  },
  [SET_ALERT]: {
    accepts: (action: AnyAction): action is SetAlertAction =>
      action.type === SET_ALERT,
    perform: (state: FeedbackStateBranch, { payload }: SetAlertAction) => {
      const updatedPayload = { ...payload };
      // nginx returns HTML rather than a helpful concise message so we're adding one here
      if (payload.statusCode === HTTP_STATUS.BAD_GATEWAY && !payload.message) {
        updatedPayload.message = BAD_GATEWAY_ERROR;
      }
      return {
        ...state,
        alert: updatedPayload,
      };
    },
  },
  [SET_TUTORIAL_TOOLTIP_STEP]: {
    accepts: (action: AnyAction): action is SetTutorialTooltipStep =>
      action.type === SET_TUTORIAL_TOOLTIP_STEP,
    perform: (state: FeedbackStateBranch, action: SetTutorialTooltipStep) => ({
      ...state,
      tutorialTooltip: action.payload,
    }),
  },
  [START_LOADING]: {
    accepts: (action: AnyAction): action is StartLoadingAction =>
      action.type === START_LOADING,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      isLoading: true,
    }),
  },
  [STOP_LOADING]: {
    accepts: (action: AnyAction): action is StopLoadingAction =>
      action.type === STOP_LOADING,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      isLoading: false,
    }),
  },
  [ADD_REQUEST_IN_PROGRESS]: {
    accepts: (action: AnyAction): action is AddRequestInProgressAction =>
      action.type === ADD_REQUEST_IN_PROGRESS,
    perform: (
      state: FeedbackStateBranch,
      action: AddRequestInProgressAction
    ) => {
      return {
        ...state,
        requestsInProgress: addRequestToInProgress(state, action.payload),
      };
    },
  },
  [RECEIVE_FSS_JOB_COMPLETION_UPDATE]: {
    accepts: (
      action: AnyAction
    ): action is ReceiveFSSJobCompletionUpdateAction =>
      action.type === RECEIVE_FSS_JOB_COMPLETION_UPDATE,
    perform: (
      state: FeedbackStateBranch,
      { payload: fssUpload }: ReceiveFSSJobCompletionUpdateAction
    ): FeedbackStateBranch => ({
      ...state,
      // Create special key per upload to de-duplicate them
      requestsInProgress: addRequestToInProgress(
        state,
        `${AsyncRequest.COMPLETE_UPLOAD}-${fssUpload.jobId}-${fssUpload.status}`
      ),
    }),
  },
  [REMOVE_REQUEST_IN_PROGRESS]: {
    accepts: (action: AnyAction): action is RemoveRequestInProgressAction =>
      action.type === REMOVE_REQUEST_IN_PROGRESS,
    perform: (
      state: FeedbackStateBranch,
      action: RemoveRequestInProgressAction
    ) => {
      return {
        ...state,
        requestsInProgress: removeRequestFromInProgress(state, action.payload),
      };
    },
  },
  [ADD_EVENT]: {
    accepts: (action: AnyAction): action is AddEventAction =>
      action.type === ADD_EVENT,
    perform: (state: FeedbackStateBranch, action: AddEventAction) => {
      return {
        ...state,
        events: [...state.events, { ...action.payload, viewed: false }],
      };
    },
  },
  [OPEN_SET_MOUNT_POINT_NOTIFICATION]: {
    accepts: (
      action: AnyAction
    ): action is OpenSetMountPointNotificationAction =>
      action.type === OPEN_SET_MOUNT_POINT_NOTIFICATION,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      setMountPointNotificationVisible: true,
    }),
  },
  [CLOSE_SET_MOUNT_POINT_NOTIFICATION]: {
    accepts: (
      action: AnyAction
    ): action is CloseSetMountPointNotificationAction =>
      action.type === CLOSE_SET_MOUNT_POINT_NOTIFICATION,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      setMountPointNotificationVisible: false,
    }),
  },
  [OPEN_MODAL]: {
    accepts: (action: AnyAction): action is OpenModalAction =>
      action.type === OPEN_MODAL,
    perform: (state: FeedbackStateBranch, action: OpenModalAction) => ({
      ...state,
      visibleModals: uniq([...state.visibleModals, action.payload]),
    }),
  },
  [CLOSE_MODAL]: {
    accepts: (action: AnyAction): action is CloseModalAction =>
      action.type === CLOSE_MODAL,
    perform: (state: FeedbackStateBranch, action: CloseModalAction) => ({
      ...state,
      visibleModals: without(state.visibleModals, action.payload),
    }),
  },
  [OPEN_TEMPLATE_MENU_ITEM_CLICKED]: {
    accepts: (action: AnyAction): action is OpenTemplateEditorAction =>
      action.type === OPEN_TEMPLATE_MENU_ITEM_CLICKED,
    perform: (
      state: FeedbackStateBranch,
      { payload }: OpenTemplateEditorAction
    ) => ({
      ...state,
      deferredAction: clearTemplateDraft(),
      requestsInProgress: payload
        ? addRequestToInProgress(state, AsyncRequest.GET_TEMPLATE)
        : state.requestsInProgress,
      visibleModals: uniq([...state.visibleModals, "templateEditor"]),
    }),
  },
  [SET_DEFERRED_ACTION]: {
    accepts: (action: AnyAction): action is SetDeferredActionAction =>
      action.type === SET_DEFERRED_ACTION,
    perform: (state: FeedbackStateBranch, action: SetDeferredActionAction) => ({
      ...state,
      deferredAction: action.payload,
    }),
  },
  [CLEAR_DEFERRED_ACTION]: {
    accepts: (action: AnyAction): action is ClearDeferredAction =>
      action.type === CLEAR_DEFERRED_ACTION,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      deferredAction: undefined,
    }),
  },
  [RESET_UPLOAD]: {
    accepts: (action: AnyAction): action is ResetUploadAction =>
      action.type === RESET_UPLOAD,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      setMountPointNotificationVisible: false,
      uploadError: undefined,
    }),
  },
  [UPLOAD_FAILED]: {
    accepts: (action: AnyAction): action is UploadFailedAction =>
      action.type === UPLOAD_FAILED,
    perform: (state: FeedbackStateBranch, action: UploadFailedAction) => ({
      ...state,
      alert: getErrorAlert(action.payload.error),
      requestsInProgress: removeRequestFromInProgress(
        state,
        `${AsyncRequest.UPLOAD}-${action.payload.jobName}`
      ),
    }),
  },
  [CLEAR_UPLOAD_ERROR]: {
    accepts: (action: AnyAction): action is ClearUploadErrorAction =>
      action.type === CLEAR_UPLOAD_ERROR,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      uploadError: undefined,
    }),
  },
  [VIEW_UPLOADS]: {
    accepts: (action: AnyAction): action is ViewUploadsAction =>
      action.type === VIEW_UPLOADS,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: uniq([
        ...state.requestsInProgress,
        AsyncRequest.GET_FILE_METADATA_FOR_JOB,
      ]),
    }),
  },
  [APPLY_TEMPLATE]: {
    accepts: (action: AnyAction): action is ApplyTemplateAction =>
      action.type === APPLY_TEMPLATE,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.GET_TEMPLATE
      ),
    }),
  },
  [SET_APPLIED_TEMPLATE]: {
    accepts: (action: AnyAction): action is SetAppliedTemplateAction =>
      action.type === SET_APPLIED_TEMPLATE,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.GET_TEMPLATE
      ),
    }),
  },
  [SAVE_TEMPLATE]: {
    accepts: (action: AnyAction): action is SaveTemplateAction =>
      action.type === SAVE_TEMPLATE,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.SAVE_TEMPLATE
      ),
    }),
  },
  [RECEIVE_JOBS]: {
    accepts: (action: AnyAction): action is ReceiveJobsAction =>
      action.type === RECEIVE_JOBS,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.GET_JOBS
      ),
    }),
  },
  [INITIATE_UPLOAD]: {
    accepts: (action: AnyAction): action is InitiateUploadAction =>
      action.type === INITIATE_UPLOAD,
    perform: (state: FeedbackStateBranch, action: InitiateUploadAction) => ({
      ...state,
      alert: getInfoAlert("Starting upload"),
      requestsInProgress: uniq([
        ...state.requestsInProgress,
        `${AsyncRequest.INITIATE_UPLOAD}-${action.payload}`,
      ]),
    }),
  },
  [INITIATE_UPLOAD_SUCCEEDED]: {
    accepts: (action: AnyAction): action is InitiateUploadSucceededAction =>
      action.type === INITIATE_UPLOAD_SUCCEEDED,
    perform: (
      state: FeedbackStateBranch,
      { payload }: InitiateUploadSucceededAction
    ) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(
        state,
        `${AsyncRequest.INITIATE_UPLOAD}-${payload}`
      ),
      uploadError: undefined,
    }),
  },
  [INITIATE_UPLOAD_FAILED]: {
    accepts: (action: AnyAction): action is InitiateUploadFailedAction =>
      action.type === INITIATE_UPLOAD_FAILED,
    perform: (
      state: FeedbackStateBranch,
      action: InitiateUploadFailedAction
    ) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(
        state,
        `${AsyncRequest.INITIATE_UPLOAD}-${action.payload.jobName}`
      ),
      uploadError: action.payload.error,
    }),
  },
  [UPLOAD_SUCCEEDED]: {
    accepts: (action: AnyAction): action is UploadSucceededAction =>
      action.type === UPLOAD_SUCCEEDED,
    perform: (
      state: FeedbackStateBranch,
      { payload: jobName }: UploadSucceededAction
    ) => ({
      ...state,
      alert: getSuccessAlert(`Upload ${jobName} succeeded!`),
      requestsInProgress: removeRequestFromInProgress(
        state,
        `${AsyncRequest.UPLOAD}-${jobName}`
      ),
    }),
  },
  [RETRY_UPLOADS]: {
    accepts: (action: AnyAction): action is RetryUploadAction =>
      action.type === RETRY_UPLOADS,
    perform: (
      state: FeedbackStateBranch,
      { payload: uploads }: RetryUploadAction
    ) => ({
      ...state,
      alert: getInfoAlert(
        `Retrying upload ${uploads.map((u) => u.jobName).join(", ")}`
      ),
      requestsInProgress: addRequestToInProgress(
        state,
        `${AsyncRequest.UPLOAD}-${uploads.map((u) => u.jobName).join(", ")}`
      ),
    }),
  },
  [CANCEL_UPLOADS]: {
    accepts: (action: AnyAction): action is CancelUploadAction =>
      action.type === CANCEL_UPLOADS,
    perform: (
      state: FeedbackStateBranch,
      { payload: uploads }: CancelUploadAction
    ) => ({
      ...state,
      alert: getInfoAlert(
        `Cancelling upload ${uploads.map((u) => u.jobName).join(", ")}`
      ),
      requestsInProgress: addRequestToInProgress(
        state,
        `${AsyncRequest.CANCEL_UPLOAD}-${uploads
          .map((u) => u.jobName)
          .join(", ")}`
      ),
    }),
  },
  [CANCEL_UPLOAD_SUCCEEDED]: {
    accepts: (action: AnyAction): action is CancelUploadSucceededAction =>
      action.type === CANCEL_UPLOAD_SUCCEEDED,
    perform: (
      state: FeedbackStateBranch,
      { payload: jobName }: CancelUploadSucceededAction
    ) => ({
      ...state,
      alert: getSuccessAlert(`Cancel upload ${jobName} succeeded`),
      requestsInProgress: removeRequestFromInProgress(
        state,
        `${AsyncRequest.CANCEL_UPLOAD}-${jobName}`
      ),
    }),
  },
  [CANCEL_UPLOAD_FAILED]: {
    accepts: (action: AnyAction): action is CancelUploadFailedAction =>
      action.type === CANCEL_UPLOAD_FAILED,
    perform: (
      state: FeedbackStateBranch,
      { payload: { error, jobName } }: CancelUploadFailedAction
    ) => ({
      ...state,
      alert: getErrorAlert(error),
      requestsInProgress: removeRequestFromInProgress(
        state,
        `${AsyncRequest.CANCEL_UPLOAD}-${jobName}`
      ),
    }),
  },
  [START_TEMPLATE_DRAFT]: {
    accepts: (action: AnyAction): action is StartTemplateDraftAction =>
      action.type === START_TEMPLATE_DRAFT,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.GET_TEMPLATE
      ),
    }),
  },
  [START_TEMPLATE_DRAFT_FAILED]: {
    accepts: (action: AnyAction): action is StartTemplateDraftFailedAction =>
      action.type === START_TEMPLATE_DRAFT_FAILED,
    perform: (
      state: FeedbackStateBranch,
      action: StartTemplateDraftFailedAction
    ) => ({
      ...state,
      alert: getErrorAlert(action.payload),
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.GET_TEMPLATE
      ),
    }),
  },
  [SUBMIT_FILE_METADATA_UPDATE]: {
    accepts: (action: AnyAction): action is SubmitFileMetadataUpdateAction =>
      action.type === SUBMIT_FILE_METADATA_UPDATE,
    perform: (
      state: FeedbackStateBranch,
      { payload: jobName }: SubmitFileMetadataUpdateAction
    ) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        `${AsyncRequest.UPDATE_FILE_METADATA}-${jobName}`
      ),
    }),
  },
  [EDIT_FILE_METADATA_FAILED]: {
    accepts: (action: AnyAction): action is EditFileMetadataFailedAction =>
      action.type === EDIT_FILE_METADATA_FAILED,
    perform: (
      state: FeedbackStateBranch,
      { payload: { error, jobName } }: EditFileMetadataFailedAction
    ) => ({
      ...state,
      alert: getErrorAlert(error),
      requestsInProgress: removeRequestFromInProgress(
        state,
        `${AsyncRequest.UPDATE_FILE_METADATA}-${jobName}`
      ),
    }),
  },
  [EDIT_FILE_METADATA_SUCCEEDED]: {
    accepts: (action: AnyAction): action is EditFileMetadataSucceededAction =>
      action.type === EDIT_FILE_METADATA_SUCCEEDED,
    perform: (
      state: FeedbackStateBranch,
      { payload: jobName }: EditFileMetadataSucceededAction
    ) => ({
      ...state,
      alert: getSuccessAlert("File metadata updated successfully!"),
      requestsInProgress: removeRequestFromInProgress(
        state,
        `${AsyncRequest.UPDATE_FILE_METADATA}-${jobName}`
      ),
    }),
  },
  [VIEW_UPLOADS_SUCCEEDED]: {
    accepts: (action: AnyAction): action is ViewUploadsSucceededAction =>
      action.type === VIEW_UPLOADS_SUCCEEDED,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.GET_FILE_METADATA_FOR_JOB
      ),
    }),
  },
  [REQUEST_METADATA]: {
    accepts: (action: AnyAction): action is RequestMetadataAction =>
      action.type === REQUEST_METADATA,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.GET_METADATA
      ),
    }),
  },
  [RECEIVE_METADATA]: {
    accepts: (action: AnyAction): action is ReceiveMetadataAction =>
      action.type === RECEIVE_METADATA,
    perform: (
      state: FeedbackStateBranch,
      { payload: { requestType } }: ReceiveMetadataAction
    ) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(state, requestType),
    }),
  },
  [REQUEST_ANNOTATION_USAGE]: {
    accepts: (action: AnyAction): action is RequestAnnotationUsage =>
      action.type === REQUEST_ANNOTATION_USAGE,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.REQUEST_ANNOTATION_USAGE
      ),
    }),
  },
  [RECEIVE_ANNOTATION_USAGE]: {
    accepts: (action: AnyAction): action is ReceiveAnnotationUsageAction =>
      action.type === RECEIVE_ANNOTATION_USAGE,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.REQUEST_ANNOTATION_USAGE
      ),
    }),
  },
  [REQUEST_FAILED]: {
    accepts: (action: AnyAction): action is RequestFailedAction =>
      action.type === REQUEST_FAILED,
    perform: (
      state: FeedbackStateBranch,
      { payload: { error, requestType } }: RequestFailedAction
    ) => ({
      ...state,
      alert: getErrorAlert(error),
      requestsInProgress: removeRequestFromInProgress(state, requestType),
    }),
  },
  [GET_BARCODE_SEARCH_RESULTS]: {
    accepts: (action: AnyAction): action is GetBarcodeSearchResultsAction =>
      action.type === GET_BARCODE_SEARCH_RESULTS,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.GET_BARCODE_SEARCH_RESULTS
      ),
    }),
  },
  [CREATE_ANNOTATION]: {
    accepts: (action: AnyAction): action is CreateAnnotationAction =>
      action.type === CREATE_ANNOTATION,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.CREATE_ANNOTATION
      ),
    }),
  },
  [EDIT_ANNOTATION]: {
    accepts: (action: AnyAction): action is EditAnnotationAction =>
      action.type === EDIT_ANNOTATION,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.EDIT_ANNOTATION
      ),
    }),
  },
  [GET_TEMPLATES]: {
    accepts: (action: AnyAction): action is GetTemplatesAction =>
      action.type === GET_TEMPLATES,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.GET_TEMPLATES
      ),
    }),
  },
  [GET_OPTIONS_FOR_LOOKUP]: {
    accepts: (action: AnyAction): action is GetOptionsForLookupAction =>
      action.type === GET_OPTIONS_FOR_LOOKUP,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      requestsInProgress: addRequestToInProgress(
        state,
        AsyncRequest.GET_OPTIONS_FOR_LOOKUP
      ),
    }),
  },
  [SAVE_TEMPLATE_SUCCEEDED]: {
    accepts: (action: AnyAction): action is SaveTemplateSucceededAction =>
      action.type === SAVE_TEMPLATE_SUCCEEDED,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      alert: getSuccessAlert("Template saved successfully!"),
      requestsInProgress: removeRequestFromInProgress(
        state,
        AsyncRequest.SAVE_TEMPLATE
      ),
      visibleModals: without(state.visibleModals, "templateEditor"),
    }),
  },
  [CLOSE_NOTIFICATION_CENTER]: {
    accepts: (action: AnyAction): action is CloseNotificationCenter =>
      action.type === CLOSE_NOTIFICATION_CENTER,
    perform: (state: FeedbackStateBranch) => ({
      ...state,
      events: state.events.map((event) => ({ ...event, viewed: true })),
    }),
  },
};

export default makeReducer<FeedbackStateBranch>(
  actionToConfigMap,
  initialState
);

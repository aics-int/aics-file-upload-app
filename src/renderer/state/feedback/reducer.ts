import { uniq, without } from "lodash";
import { AnyAction } from "redux";
import { OPEN_TEMPLATE_EDITOR } from "../../../shared/constants";

import { SelectionStateBranch } from "../selection/types";
import {
    TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";

import {
    ADD_EVENT,
    ADD_REQUEST_IN_PROGRESS,
    CLEAR_ALERT,
    CLEAR_DEFERRED_ACTIONS,
    CLOSE_MODAL,
    CLOSE_SET_MOUNT_POINT_NOTIFICATION,
    OPEN_MODAL,
    OPEN_SET_MOUNT_POINT_NOTIFICATION,
    REMOVE_REQUEST_IN_PROGRESS,
    SET_ALERT,
    SET_DEFERRED_ACTIONS,
    START_LOADING,
    STOP_LOADING,
} from "./constants";
import {
    AddEventAction,
    AddRequestInProgressAction,
    ClearAlertAction,
    ClearDeferredAction,
    CloseModalAction,
    CloseSetMountPointNotificationAction,
    FeedbackStateBranch,
    OpenModalAction,
    OpenSetMountPointNotificationAction,
    OpenTemplateEditorAction,
    RemoveRequestInProgressAction,
    SetAlertAction,
    SetDeferredActionsAction,
    StartLoadingAction,
    StopLoadingAction,
} from "./types";

export const initialState: FeedbackStateBranch = {
    deferredActions: [],
    events: [],
    isLoading: false,
    requestsInProgress: [],
    setMountPointNotificationVisible: false,
    visibleModals: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [CLEAR_ALERT]: {
        accepts: (action: AnyAction): action is ClearAlertAction => action.type === CLEAR_ALERT,
        perform: (state: FeedbackStateBranch) => {
            return {
                ...state,
                alert: undefined,
            };
        },
    },
    [SET_ALERT]: {
        accepts: (action: AnyAction): action is SetAlertAction => action.type === SET_ALERT,
        perform: (state: FeedbackStateBranch, action: SetAlertAction) => {
            return {
                ...state,
                alert: action.payload,
            };
        },
    },
    [START_LOADING]: {
        accepts: (action: AnyAction): action is StartLoadingAction => action.type === START_LOADING,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            isLoading: true,
        }),
    },
    [STOP_LOADING]: {
        accepts: (action: AnyAction): action is StopLoadingAction => action.type === STOP_LOADING,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            isLoading: false,
        }),
    },
    [ADD_REQUEST_IN_PROGRESS]: {
        accepts: (action: AnyAction): action is AddRequestInProgressAction => action.type === ADD_REQUEST_IN_PROGRESS,
        perform: (state: FeedbackStateBranch, action: AddRequestInProgressAction) => {
            const requestsInProgress = uniq([...state.requestsInProgress, action.payload]);

            return {
                ...state,
                requestsInProgress,
            };
        },
    },
    [REMOVE_REQUEST_IN_PROGRESS]: {
        accepts: (action: AnyAction): action is RemoveRequestInProgressAction =>
            action.type === REMOVE_REQUEST_IN_PROGRESS,
        perform: (state: FeedbackStateBranch, action: RemoveRequestInProgressAction) => {
            const requestsInProgress = state.requestsInProgress.filter((req) => req !== action.payload);

            return {
                ...state,
                requestsInProgress,
            };
        },
    },
    [ADD_EVENT]: {
        accepts: (action: AnyAction): action is AddEventAction => action.type === ADD_EVENT,
        perform: (state: FeedbackStateBranch, action: AddEventAction) => {
            return {
                ...state,
                events: [...state.events, action.payload],
            };
        },
    },
    [OPEN_SET_MOUNT_POINT_NOTIFICATION]: {
        accepts: (action: AnyAction): action is OpenSetMountPointNotificationAction =>
            action.type === OPEN_SET_MOUNT_POINT_NOTIFICATION,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            setMountPointNotificationVisible: true,
        }),
    },
    [CLOSE_SET_MOUNT_POINT_NOTIFICATION]: {
        accepts: (action: AnyAction): action is CloseSetMountPointNotificationAction =>
            action.type === CLOSE_SET_MOUNT_POINT_NOTIFICATION,
        perform: (state: SelectionStateBranch) => ({
            ...state,
            setMountPointNotificationVisible: false,
        }),
    },
    [OPEN_MODAL]: {
        accepts: (action: AnyAction): action is OpenModalAction => action.type === OPEN_MODAL,
        perform: (state: FeedbackStateBranch, action: OpenModalAction) => ({
            ...state,
            visibleModals: uniq([...state.visibleModals, action.payload]),
        }),
    },
    [CLOSE_MODAL]: {
        accepts: (action: AnyAction): action is CloseModalAction => action.type === CLOSE_MODAL,
        perform: (state: FeedbackStateBranch, action: CloseModalAction) => ({
            ...state,
            visibleModals: without(state.visibleModals, action.payload),
        }),
    },
    [OPEN_TEMPLATE_EDITOR]: {
        accepts: (action: AnyAction): action is OpenTemplateEditorAction => action.type === OPEN_TEMPLATE_EDITOR,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            visibleModals: uniq([...state.visibleModals, "templateEditor"]),
        }),
    },
    [SET_DEFERRED_ACTIONS]: {
        accepts: (action: AnyAction): action is SetDeferredActionsAction => action.type === SET_DEFERRED_ACTIONS,
        perform: (state: FeedbackStateBranch, action: SetDeferredActionsAction) => ({
            ...state,
            deferredAction: action.payload,
        }),
    },
    [CLEAR_DEFERRED_ACTIONS]: {
        accepts: (action: AnyAction): action is ClearDeferredAction => action.type === CLEAR_DEFERRED_ACTIONS,
        perform: (state: FeedbackStateBranch) => ({
            ...state,
            deferredAction: [],
        }),
    },
};

export default makeReducer<FeedbackStateBranch>(actionToConfigMap, initialState);

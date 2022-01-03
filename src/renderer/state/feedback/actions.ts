import { AnyAction } from "redux";

import {
  AlertType,
  AppAlert,
  AsyncRequest,
  ModalName,
  TutorialStep,
} from "../types";

import {
  ADD_EVENT,
  ADD_REQUEST_IN_PROGRESS,
  CHECK_FOR_UPDATE,
  CLEAR_ALERT,
  CLEAR_DEFERRED_ACTION,
  CLEAR_UPLOAD_ERROR,
  CLOSE_MODAL,
  CLOSE_NOTIFICATION_CENTER,
  OPEN_MODAL,
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
  CheckForUpdateAction,
  ClearAlertAction,
  ClearDeferredAction,
  ClearUploadErrorAction,
  CloseModalAction,
  CloseNotificationCenter,
  OpenModalAction,
  RemoveRequestInProgressAction,
  SetAlertAction,
  SetDeferredActionAction,
  SetTutorialTooltipStep,
  StartLoadingAction,
  StopLoadingAction,
} from "./types";

export function setAlert(payload: AppAlert): SetAlertAction {
  return {
    payload,
    type: SET_ALERT,
  };
}

export function clearAlert(): ClearAlertAction {
  return {
    type: CLEAR_ALERT,
  };
}

export function setErrorAlert(message: string): SetAlertAction {
  return {
    payload: {
      message,
      type: AlertType.ERROR,
    },
    type: SET_ALERT,
  };
}

export function setWarningAlert(message: string): SetAlertAction {
  return {
    payload: {
      message,
      type: AlertType.WARN,
    },
    type: SET_ALERT,
  };
}

export function setSuccessAlert(message: string): SetAlertAction {
  return {
    payload: {
      message,
      type: AlertType.SUCCESS,
    },
    type: SET_ALERT,
  };
}

export function setInfoAlert(message: string): SetAlertAction {
  return {
    payload: {
      message,
      type: AlertType.INFO,
    },
    type: SET_ALERT,
  };
}

export function checkForUpdate(): CheckForUpdateAction {
  return {
    type: CHECK_FOR_UPDATE,
  };
}

export function startLoading(): StartLoadingAction {
  return {
    type: START_LOADING,
  };
}
export function stopLoading(): StopLoadingAction {
  return {
    type: STOP_LOADING,
  };
}

export function addRequestToInProgress(
  payload: AsyncRequest
): AddRequestInProgressAction {
  return {
    payload,
    type: ADD_REQUEST_IN_PROGRESS,
  };
}

export function removeRequestFromInProgress(
  payload: AsyncRequest | string
): RemoveRequestInProgressAction {
  return {
    payload,
    type: REMOVE_REQUEST_IN_PROGRESS,
  };
}

export function addEvent(
  message: string,
  type: AlertType,
  date: Date
): AddEventAction {
  return {
    payload: {
      date,
      message,
      type,
    },
    type: ADD_EVENT,
  };
}

export function openModal(modalName: ModalName): OpenModalAction {
  return {
    payload: modalName,
    type: OPEN_MODAL,
  };
}

export function closeModal(modalName: ModalName): CloseModalAction {
  return {
    payload: modalName,
    type: CLOSE_MODAL,
  };
}

export function setDeferredAction(action: AnyAction): SetDeferredActionAction {
  return {
    payload: action,
    type: SET_DEFERRED_ACTION,
  };
}

export function clearDeferredAction(): ClearDeferredAction {
  return {
    type: CLEAR_DEFERRED_ACTION,
  };
}

export function clearUploadError(): ClearUploadErrorAction {
  return {
    type: CLEAR_UPLOAD_ERROR,
  };
}

export function closeNotificationCenter(): CloseNotificationCenter {
  return {
    type: CLOSE_NOTIFICATION_CENTER,
  };
}

export function setTutorialTooltipStep(
  tutorialTooltip?: TutorialStep
): SetTutorialTooltipStep {
  return {
    payload: tutorialTooltip,
    type: SET_TUTORIAL_TOOLTIP_STEP,
  };
}

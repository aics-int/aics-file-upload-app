import { AnyAction } from "redux";

import {
  AlertType,
  AppAlert,
  AsyncRequest,
  ModalName,
  TutorialStep,
} from "../types";

export interface CheckForUpdateAction {
  type: string;
}

export interface StartLoadingAction {
  type: string;
}

export interface StopLoadingAction {
  type: string;
}

export interface SetAlertAction {
  payload: AppAlert;
  type: string;
}

export interface ClearAlertAction {
  type: string;
}

export interface AddRequestInProgressAction {
  type: string;
  payload: AsyncRequest;
}

export interface RemoveRequestInProgressAction {
  type: string;
  payload: AsyncRequest | string;
}

export interface AddEventAction {
  type: string;
  payload: {
    date: Date;
    message: string;
    type: AlertType;
  };
}

export interface OpenModalAction {
  payload: ModalName;
  type: string;
}

export interface CloseModalAction {
  payload: ModalName;
  type: string;
}

export interface OpenTemplateEditorAction {
  payload?: number;
  type: string;
}

export interface SetDeferredActionAction {
  payload: AnyAction;
  type: string;
}

export interface ClearDeferredAction {
  type: string;
}

export interface ClearUploadErrorAction {
  type: string;
}

export interface CloseNotificationCenter {
  type: string;
}

export interface SetTutorialTooltipStep {
  payload?: TutorialStep;
  type: string;
}

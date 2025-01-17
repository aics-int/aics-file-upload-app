import { UploadJob } from "../../services/job-status-service/types";
import { Page, UploadStateBranch } from "../types";

import {
  CLOSE_UPLOAD,
  RESET_UPLOAD,
  SELECT_PAGE,
  SELECT_VIEW,
  START_NEW_UPLOAD,
  VIEW_UPLOADS,
  VIEW_UPLOADS_SUCCEEDED,
} from "./constants";
import {
  CloseUploadAction,
  ResetUploadAction,
  SelectPageAction,
  SelectViewAction,
  StartNewUploadAction,
  ViewUploadsAction,
  ViewUploadsSucceededAction,
} from "./types";

export function closeUpload(): CloseUploadAction {
  return {
    type: CLOSE_UPLOAD,
  };
}

export function startNewUpload(): StartNewUploadAction {
  return {
    type: START_NEW_UPLOAD,
  };
}

export function resetUpload(): ResetUploadAction {
  return {
    type: RESET_UPLOAD,
  };
}

export function selectPage(
  page: Page.UploadWithTemplate | Page.MyUploads | Page.AddMetadata
): SelectPageAction {
  return {
    payload: page,
    type: SELECT_PAGE,
  };
}

export function selectView(view: Page): SelectViewAction {
  return {
    payload: view,
    type: SELECT_VIEW,
  };
}

export function viewUploads(uploads: UploadJob[]): ViewUploadsAction {
  return {
    payload: uploads,
    type: VIEW_UPLOADS,
  };
}

export function viewUploadsSucceeded(
  originalUploads: UploadStateBranch
): ViewUploadsSucceededAction {
  return {
    payload: {
      originalUploads,
    },
    type: VIEW_UPLOADS_SUCCEEDED,
  };
}

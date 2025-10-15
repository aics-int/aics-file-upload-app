import { UploadJob } from "../../services/job-status-service/types";
import { Page, UploadStateBranch } from "../types";

export interface AppPageConfig {
  container: JSX.Element;
}

export interface CloseUploadAction {
  type: string;
}

export interface StartNewUploadAction {
  type: string;
}

export interface ResetUploadAction {
  type: string;
}

export interface SelectPageAction {
  payload: Page.UploadWithTemplate | Page.MyUploads | Page.AddMetadata;
  type: string;
}

export interface SelectViewAction {
  payload: Page;
  type: string;
}

export interface ViewUploadsAction {
  payload: UploadJob[];
  type: string;
}

export interface ViewUploadsSucceededAction {
  payload: {
    originalUploads: UploadStateBranch;
  };
  type: string;
}

export interface Upload {
  templateId?: number;
  uploadMetadata: UploadStateBranch;
}

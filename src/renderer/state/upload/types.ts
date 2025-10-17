import { UploadJob } from "../../services/job-status-service/types";
import { AutoSaveAction, FileModel, State, WriteToStoreAction } from "../types";

export interface MMSAnnotationValueRequest {
  annotationId: number;
  values: string[];
}

export interface AddUploadFilesAction extends AutoSaveAction {
  payload: FileModel[]; // array of files to upload
  type: string;
}

export interface ApplyTemplateAction extends WriteToStoreAction {
  payload: number;
  type: string;
}

export interface UpdateUploadAction extends AutoSaveAction {
  payload: {
    key: string;
    upload: Partial<FileModel>;
  };
  type: string;
}

export interface UpdateUploadRowsAction extends AutoSaveAction {
  payload: {
    uploadKeys: string[];
    metadataUpdate: Partial<FileModel>;
  };
  type: string;
}

export interface JumpToPastUploadAction extends AutoSaveAction {
  index: number;
  type: string;
}

export interface JumpToUploadAction extends AutoSaveAction {
  index: number;
  type: string;
}

export interface ClearUploadHistoryAction extends AutoSaveAction {
  type: string;
}

export interface RemoveUploadsAction extends AutoSaveAction {
  payload: string[]; // fullpaths to remove from upload state branch
  type: string;
}

export interface InitiateUploadAction extends AutoSaveAction {
  payload: string;
  type: string;
}

export interface InitiateUploadSucceededAction {
  payload: string;
  type: string;
}

export interface InitiateUploadFailedAction {
  payload: {
    jobName: string;
    error: string;
  };
  type: string;
}

export interface UploadSucceededAction {
  payload: string;
  type: string;
}

export interface UploadFailedAction {
  payload: {
    jobName: string;
    error: string;
  };
  type: string;
}

export interface UploadWithoutMetadataAction {
  payload: string[];
  type: string;
}

export interface CancelUploadAction<T extends UploadJob = UploadJob> {
  payload: T[];
  type: string;
}

export interface RetryUploadAction<T extends UploadJob = UploadJob> {
  payload: T[];
  type: string;
}

export interface CancelUploadSucceededAction {
  payload: string;
  type: string;
}

export interface CancelUploadFailedAction {
  payload: {
    error: string;
    jobName: string;
  };
  type: string;
}
export interface UpdateUploadsAction extends AutoSaveAction {
  payload: {
    clearAll: boolean;
    uploads: Partial<FileModel>;
  };
  type: string;
}

export interface SaveUploadDraftAction {
  // represents whether to set uploadDraftFilePath after success
  payload: boolean;
  type: string;
}

export interface OpenUploadDraftAction {
  type: string;
}

export interface ReplaceUploadAction {
  payload: {
    filePath: string;
    replacementState: State;
  };
  type: string;
}

export interface ClearUploadDraftAction extends WriteToStoreAction {
  type: string;
}

export interface SubmitFileMetadataUpdateAction {
  payload?: string; // jobName
  type: string;
}

export interface EditFileMetadataSucceededAction {
  payload: string; // jobName
  type: string;
}

export interface EditFileMetadataFailedAction {
  payload: {
    error: string;
    jobName: string;
  };
  type: string;
}

export interface SaveUploadDraftSuccessAction extends WriteToStoreAction {
  // this is the file path of the draft that was saved. It is undefined if we do not want to set this value on
  // the store - for example when closing the upload tab we may save the draft but we want this value to be undefined.
  payload?: string;
  type: string;
}

export enum FileType {
  CSV = "csv",
  IMAGE = "image",
  OTHER = "other",
  TEXT = "text",
  ZEISS_CONFIG_FILE = "zeiss-config-file",
}

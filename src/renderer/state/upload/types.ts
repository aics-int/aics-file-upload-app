import { AnnotationName } from "../../constants";
import { UploadJob } from "../../services/job-status-service/types";
import {
  AutoSaveAction,
  FileModel,
  FileModelId,
  State,
  WriteToStoreAction,
} from "../types";

export interface MMSAnnotationValueRequest {
  annotationId: number;
  channelId?: string; // channel name or channel index (not primary key)
  positionIndex?: number;
  scene?: number;
  subImageName?: string;
  values: string[];
}

export interface AddUploadFilesAction extends AutoSaveAction {
  payload: FileModelId[];
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

export interface UploadTableRow extends FileModel {
  // react-table property for discovering sub rows for any given row
  subRows: UploadTableRow[];

  // Keeps track of all positionIndexes - used only on the top-level row
  positionIndexes: number[];

  // Keeps track of all scenes - used only on top-level row
  scenes: number[];

  // Keeps track of all sub image names - used only on top-level row
  subImageNames: string[];

  // Keeps track of all channelIds - used only on the top-level row
  [AnnotationName.CHANNEL_TYPE]: string[];
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

export interface UpdateSubImagesPayload {
  channelIds: string[];
  positionIndexes: number[];
  row: UploadTableRow;
  scenes: number[];
  subImageNames: string[];
}

export interface UpdateSubImagesAction extends AutoSaveAction {
  payload: UpdateSubImagesPayload;
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

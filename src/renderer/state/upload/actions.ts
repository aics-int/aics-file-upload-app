import {
  PREFERRED_TEMPLATE_ID,
  TEMP_UPLOAD_STORAGE_KEY,
} from "../../../shared/constants";
import { MXSResult } from "../../services/metadata-extraction-service";
import { State, FileModel, UploadSummaryTableRow } from "../types";

import {
  APPLY_TEMPLATE,
  CANCEL_UPLOADS,
  CANCEL_UPLOAD_FAILED,
  CANCEL_UPLOAD_SUCCEEDED,
  CLEAR_UPLOAD_DRAFT,
  CLEAR_UPLOAD_HISTORY,
  DELETE_UPLOADS,
  EDIT_FILE_METADATA_FAILED,
  EDIT_FILE_METADATA_SUCCEEDED,
  INITIATE_UPLOAD,
  INITIATE_UPLOAD_FAILED,
  INITIATE_UPLOAD_SUCCEEDED,
  JUMP_TO_PAST_UPLOAD,
  JUMP_TO_UPLOAD,
  OPEN_UPLOAD_DRAFT,
  REPLACE_UPLOAD,
  RETRY_UPLOADS,
  SAVE_UPLOAD_DRAFT,
  SAVE_UPLOAD_DRAFT_SUCCESS,
  SET_SHOULD_BE_IN_LOCAL,
  SUBMIT_FILE_METADATA_UPDATE,
  UPDATE_UPLOAD,
  UPDATE_UPLOAD_ROWS,
  UPDATE_UPLOADS,
  UPLOAD_FAILED,
  UPLOAD_SUCCEEDED,
  ADD_UPLOAD_FILES,
  UPLOAD_WITHOUT_METADATA,
  AUTOFILL_FROM_MXS,
} from "./constants";
import {
  AddUploadFilesAction,
  ApplyTemplateAction,
  CancelUploadAction,
  CancelUploadFailedAction,
  CancelUploadSucceededAction,
  ClearUploadDraftAction,
  ClearUploadHistoryAction,
  EditFileMetadataFailedAction,
  EditFileMetadataSucceededAction,
  InitiateUploadAction,
  InitiateUploadFailedAction,
  InitiateUploadSucceededAction,
  JumpToPastUploadAction,
  JumpToUploadAction,
  OpenUploadDraftAction,
  RemoveUploadsAction,
  ReplaceUploadAction,
  RetryUploadAction,
  SaveUploadDraftAction,
  SaveUploadDraftSuccessAction,
  SubmitFileMetadataUpdateAction,
  UpdateUploadAction,
  UpdateUploadRowsAction,
  UpdateUploadsAction,
  UploadFailedAction,
  UploadSucceededAction,
  UploadWithoutMetadataAction,
  AutofillFromMXSAction,
} from "./types";

export function addUploadFiles(
  filesToUpload: FileModel[]
): AddUploadFilesAction {
  return {
    autoSave: true,
    payload: filesToUpload,
    type: ADD_UPLOAD_FILES,
  };
}

export function jumpToPastUpload(index: number): JumpToPastUploadAction {
  return {
    autoSave: true,
    index,
    type: JUMP_TO_PAST_UPLOAD,
  };
}

export function jumpToUpload(index: number): JumpToUploadAction {
  return {
    autoSave: true,
    index,
    type: JUMP_TO_UPLOAD,
  };
}

export function clearUploadHistory(): ClearUploadHistoryAction {
  return {
    autoSave: true,
    type: CLEAR_UPLOAD_HISTORY,
  };
}

export function removeUploads(fullPaths: string[]): RemoveUploadsAction {
  return {
    autoSave: true,
    payload: fullPaths,
    type: DELETE_UPLOADS,
  };
}

export function initiateUpload(): InitiateUploadAction {
  return {
    autoSave: true,
    payload: "Initiating upload",
    writeToStore: true,
    type: INITIATE_UPLOAD,
  };
}

export function initiateUploadSucceeded(
  jobName: string
): InitiateUploadSucceededAction {
  return {
    payload: jobName,
    type: INITIATE_UPLOAD_SUCCEEDED,
  };
}

export function initiateUploadFailed(
  jobName: string,
  error: string
): InitiateUploadFailedAction {
  return {
    payload: {
      error,
      jobName,
    },
    type: INITIATE_UPLOAD_FAILED,
  };
}

export function uploadSucceeded(jobName: string): UploadSucceededAction {
  return {
    payload: jobName,
    type: UPLOAD_SUCCEEDED,
  };
}

export function uploadFailed(
  error: string,
  jobName: string
): UploadFailedAction {
  return {
    payload: {
      error,
      jobName,
    },
    type: UPLOAD_FAILED,
  };
}

export function uploadWithoutMetadata(
  filePaths: string[]
): UploadWithoutMetadataAction {
  return {
    payload: filePaths,
    type: UPLOAD_WITHOUT_METADATA,
  };
}

export function applyTemplate(templateId: number): ApplyTemplateAction {
  return {
    payload: templateId,
    type: APPLY_TEMPLATE,
    updates: {
      [PREFERRED_TEMPLATE_ID]: templateId,
    },
    writeToStore: true,
  };
}

export function updateUpload(
  key: string,
  upload: Partial<FileModel>
): UpdateUploadAction {
  return {
    autoSave: true,
    payload: {
      key,
      upload,
    },
    type: UPDATE_UPLOAD,
  };
}

export function updateUploadRows(
  uploadKeys: string[],
  metadataUpdate: Partial<FileModel>
): UpdateUploadRowsAction {
  return {
    autoSave: true,
    payload: {
      metadataUpdate,
      uploadKeys,
    },
    type: UPDATE_UPLOAD_ROWS,
  };
}

export function cancelUploads(
  jobs: UploadSummaryTableRow[]
): CancelUploadAction {
  return {
    payload: jobs,
    type: CANCEL_UPLOADS,
  };
}

export function cancelUploadSucceeded(
  jobName: string
): CancelUploadSucceededAction {
  return {
    payload: jobName,
    type: CANCEL_UPLOAD_SUCCEEDED,
  };
}

export function cancelUploadFailed(
  jobName: string,
  error: string
): CancelUploadFailedAction {
  return {
    payload: {
      error,
      jobName,
    },
    type: CANCEL_UPLOAD_FAILED,
  };
}

export function retryUploads(jobs: UploadSummaryTableRow[]): RetryUploadAction {
  return {
    payload: jobs,
    type: RETRY_UPLOADS,
  };
}

export function updateUploads(
  uploads: Partial<FileModel>,
  clearAll = false
): UpdateUploadsAction {
  return {
    autoSave: true,
    payload: {
      clearAll,
      uploads,
    },
    type: UPDATE_UPLOADS,
  };
}

// This will automatically save the draft if metadata.currentUploadFilePath is set
// And if not, it will open a save dialog.
// If saveFilePathToStore is true, after the user saves the data to a file, the filePath
// Will get set on metadata.currentUploadFilePath
export function saveUploadDraft(
  saveFilePathToStore = false
): SaveUploadDraftAction {
  return {
    payload: saveFilePathToStore,
    type: SAVE_UPLOAD_DRAFT,
  };
}

// This opens a native open dialog, allowing users to select a upload draft from their file system
export function openUploadDraft(): OpenUploadDraftAction {
  return {
    type: OPEN_UPLOAD_DRAFT,
  };
}

export function replaceUpload(
  filePath: string,
  replacementState: State
): ReplaceUploadAction {
  return {
    payload: { filePath, replacementState },
    type: REPLACE_UPLOAD,
  };
}

export function clearUploadDraft(): ClearUploadDraftAction {
  return {
    type: CLEAR_UPLOAD_DRAFT,
    updates: {
      [TEMP_UPLOAD_STORAGE_KEY]: undefined,
    },
    writeToStore: true,
  };
}

export function saveUploadDraftSuccess(
  filePath?: string
): SaveUploadDraftSuccessAction {
  return {
    payload: filePath,
    type: SAVE_UPLOAD_DRAFT_SUCCESS,
    updates: {
      [TEMP_UPLOAD_STORAGE_KEY]: undefined,
    },
    writeToStore: true,
  };
}

export function setShouldBeInLocal(ShouldBeInLocal: boolean) {
  return {
    type: SET_SHOULD_BE_IN_LOCAL,
    payload: ShouldBeInLocal,
  };
}

export function submitFileMetadataUpdate(): SubmitFileMetadataUpdateAction {
  return {
    type: SUBMIT_FILE_METADATA_UPDATE,
  };
}

export function editFileMetadataSucceeded(
  jobName: string
): EditFileMetadataSucceededAction {
  return {
    payload: jobName,
    type: EDIT_FILE_METADATA_SUCCEEDED,
  };
}

export function editFileMetadataFailed(
  message: string,
  jobName: string
): EditFileMetadataFailedAction {
  return {
    payload: {
      error: message,
      jobName,
    },
    type: EDIT_FILE_METADATA_FAILED,
  };
}

export function autofillFromMXS(
  filePath: string,
  mxsResult: MXSResult
): AutofillFromMXSAction {
  return {
    autoSave: true,
    payload: {
      filePath,
      mxsResult,
    },
    type: AUTOFILL_FROM_MXS,
  };
}

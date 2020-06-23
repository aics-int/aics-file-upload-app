import {
  TEMP_UPLOAD_STORAGE_KEY,
  USER_SETTINGS_KEY,
} from "../../../shared/constants";
import { UploadSummaryTableRow } from "../../containers/UploadSummary";
import { Workflow } from "../selection/types";
import { State } from "../types";

import {
  APPLY_TEMPLATE,
  ASSOCIATE_FILES_AND_WELLS,
  ASSOCIATE_FILES_AND_WORKFLOWS,
  CANCEL_UPLOAD,
  CANCEL_UPLOAD_FAILED,
  CANCEL_UPLOAD_SUCCEEDED,
  CLEAR_UPLOAD,
  CLEAR_UPLOAD_DRAFT,
  CLEAR_UPLOAD_HISTORY,
  DELETE_UPLOADS,
  EDIT_FILE_METADATA_FAILED,
  EDIT_FILE_METADATA_SUCCEEDED,
  INITIATE_UPLOAD,
  JUMP_TO_PAST_UPLOAD,
  JUMP_TO_UPLOAD,
  OPEN_UPLOAD_DRAFT,
  REMOVE_FILE_FROM_ARCHIVE,
  REMOVE_FILE_FROM_ISILON,
  REPLACE_UPLOAD,
  RETRY_UPLOAD,
  RETRY_UPLOAD_FAILED,
  RETRY_UPLOAD_SUCCEEDED,
  SAVE_UPLOAD_DRAFT,
  SUBMIT_FILE_METADATA_UPDATE,
  SAVE_UPLOAD_DRAFT_SUCCESS,
  UNDO_FILE_WELL_ASSOCIATION,
  UNDO_FILE_WORKFLOW_ASSOCIATION,
  UPDATE_FILES_TO_ARCHIVE,
  UPDATE_FILES_TO_STORE_ON_ISILON,
  UPDATE_SUB_IMAGES,
  UPDATE_UPLOAD,
  UPDATE_UPLOAD_ROWS,
  UPDATE_UPLOADS,
} from "./constants";
import {
  ApplyTemplateAction,
  AssociateFilesAndWellsAction,
  AssociateFilesAndWorkflowsAction,
  CancelUploadAction,
  CancelUploadFailedAction,
  CancelUploadSucceededAction,
  ClearUploadAction,
  ClearUploadDraftAction,
  ClearUploadHistoryAction,
  EditFileMetadataFailedAction,
  EditFileMetadataSucceededAction,
  FilepathToBoolean,
  InitiateUploadAction,
  JumpToPastUploadAction,
  JumpToUploadAction,
  OpenUploadDraftAction,
  RemoveFileFromArchiveAction,
  RemoveFileFromIsilonAction,
  RemoveUploadsAction,
  ReplaceUploadAction,
  RetryUploadAction,
  RetryUploadFailedAction,
  RetryUploadSucceededAction,
  SaveUploadDraftAction,
  SaveUploadDraftSuccessAction,
  SubmitFileMetadataUpdateAction,
  UndoFileWellAssociationAction,
  UndoFileWorkflowAssociationAction,
  UpdateFilesToArchive,
  UpdateFilesToStoreOnIsilon,
  UpdateSubImagesAction,
  UpdateSubImagesPayload,
  UpdateUploadAction,
  UpdateUploadRowsAction,
  UpdateUploadsAction,
  UploadJobTableRow,
  UploadMetadata,
  UploadRowId,
} from "./types";

export function associateFilesAndWells(
  rowIds: UploadRowId[]
): AssociateFilesAndWellsAction {
  return {
    autoSave: true,
    payload: {
      barcode: "",
      rowIds,
      wellIds: [], // this gets populated with the wells that are selected in logics
    },
    type: ASSOCIATE_FILES_AND_WELLS,
  };
}

// For undoing the well associations for a single upload row
export function undoFileWellAssociation(
  rowId: UploadRowId,
  deleteUpload = true,
  wellIds: number[] = []
): UndoFileWellAssociationAction {
  return {
    autoSave: true,
    payload: {
      deleteUpload,
      rowId,
      wellIds, // if empty, this gets populated with the wells that are selected in logics
    },
    type: UNDO_FILE_WELL_ASSOCIATION,
  };
}

export function associateFilesAndWorkflows(
  fullPaths: string[],
  workflows: Workflow[]
): AssociateFilesAndWorkflowsAction {
  return {
    autoSave: true,
    payload: {
      fullPaths,
      workflows,
    },
    type: ASSOCIATE_FILES_AND_WORKFLOWS,
  };
}

export function undoFileWorkflowAssociation(
  fullPath: string,
  workflowNames: string[]
): UndoFileWorkflowAssociationAction {
  return {
    autoSave: true,
    payload: {
      fullPath,
      workflowNames,
    },
    type: UNDO_FILE_WORKFLOW_ASSOCIATION,
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
    payload: {
      jobName: undefined,
    },
    type: INITIATE_UPLOAD,
  };
}

export function applyTemplate(templateId: number): ApplyTemplateAction {
  return {
    payload: templateId,
    type: APPLY_TEMPLATE,
    updates: {
      [`${USER_SETTINGS_KEY}.templateId`]: templateId,
    },
    writeToStore: true,
  };
}

export function updateUpload(
  key: string,
  upload: Partial<UploadMetadata>
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
  metadataUpdate: Partial<UploadMetadata>
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

export function cancelUpload(job: UploadSummaryTableRow): CancelUploadAction {
  return {
    payload: job,
    type: CANCEL_UPLOAD,
  };
}

export function cancelUploadSucceeded(
  job: UploadSummaryTableRow
): CancelUploadSucceededAction {
  return {
    payload: job,
    type: CANCEL_UPLOAD_SUCCEEDED,
  };
}

export function cancelUploadFailed(
  row: UploadSummaryTableRow,
  error: string
): CancelUploadFailedAction {
  return {
    payload: {
      error,
      row,
    },
    type: CANCEL_UPLOAD_FAILED,
  };
}

export function retryUpload(job: UploadSummaryTableRow): RetryUploadAction {
  return {
    payload: job,
    type: RETRY_UPLOAD,
  };
}

export function retryUploadSucceeded(
  job: UploadSummaryTableRow
): RetryUploadSucceededAction {
  return {
    payload: job,
    type: RETRY_UPLOAD_SUCCEEDED,
  };
}

export function retryUploadFailed(
  row: UploadSummaryTableRow,
  error: string
): RetryUploadFailedAction {
  return {
    payload: {
      error,
      row,
    },
    type: RETRY_UPLOAD_FAILED,
  };
}

export function updateUploads(
  uploads: Partial<UploadMetadata>,
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

export function updateSubImages(
  row: UploadJobTableRow,
  payload: Partial<UpdateSubImagesPayload>
): UpdateSubImagesAction {
  return {
    autoSave: true,
    payload: {
      channelIds: payload.channelIds || [],
      positionIndexes: payload.positionIndexes || [],
      row,
      scenes: payload.scenes || [],
      subImageNames: payload.subImageNames || [],
    },
    type: UPDATE_SUB_IMAGES,
  };
}

export function updateFilesToArchive(
  filesToArchive: FilepathToBoolean
): UpdateFilesToArchive {
  return {
    autoSave: true,
    payload: filesToArchive,
    type: UPDATE_FILES_TO_ARCHIVE,
  };
}

export function updateFilesToStoreOnIsilon(
  filesToStoreOnIsilon: FilepathToBoolean
): UpdateFilesToStoreOnIsilon {
  return {
    autoSave: true,
    payload: filesToStoreOnIsilon,
    type: UPDATE_FILES_TO_STORE_ON_ISILON,
  };
}

export function removeFileFromArchive(
  fileToNotArchive: string
): RemoveFileFromArchiveAction {
  return {
    autoSave: true,
    payload: fileToNotArchive,
    type: REMOVE_FILE_FROM_ARCHIVE,
  };
}

export function removeFileFromIsilon(
  fileToNotStoreOnIsilon: string
): RemoveFileFromIsilonAction {
  return {
    autoSave: true,
    payload: fileToNotStoreOnIsilon,
    type: REMOVE_FILE_FROM_ISILON,
  };
}

export function clearUpload(): ClearUploadAction {
  return {
    autoSave: true,
    type: CLEAR_UPLOAD,
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

export function submitFileMetadataUpdate(): SubmitFileMetadataUpdateAction {
  return {
    type: SUBMIT_FILE_METADATA_UPDATE,
  };
}

export function editFileMetadataSucceeded(): EditFileMetadataSucceededAction {
  return {
    type: EDIT_FILE_METADATA_SUCCEEDED,
  };
}

export function editFileMetadataFailed(
  message: string
): EditFileMetadataFailedAction {
  return {
    payload: message,
    type: EDIT_FILE_METADATA_FAILED,
  };
}

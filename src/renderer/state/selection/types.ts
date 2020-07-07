import { JSSJob } from "@aics/job-status-client/type-declarations/types";

import { GridCell } from "../../components/AssociateWells/grid-cell";
import { Workflow } from "../../services/labkey-client/types";
import {
  CellPopulation,
  PlateResponse,
  Solution,
  WellResponse,
} from "../../services/mms-client/types";
import { AutoSaveAction, MetadataStateBranch } from "../types";

export interface SelectionStateBranch extends UploadTabSelections {
  annotation: string;
  barcode?: string;
  expandedUploadJobRows: ExpandedRows;
  files: string[];
  imagingSessionId?: number;
  imagingSessionIds: Array<number | null>;
  plate: ImagingSessionIdToPlateMap;
  wells: ImagingSessionIdToWellsMap;
  selectedWells: GridCell[];
  selectedWorkflows: Workflow[];
  stagedFiles: UploadFile[];
  user: string;
}

export interface UploadTabSelections {
  barcode?: string;
  expandedUploadJobRows: ExpandedRows;
  imagingSessionId?: number;
  imagingSessionIds: Array<number | null>;
  job?: JSSJob;
  plate: ImagingSessionIdToPlateMap;
  wells: ImagingSessionIdToWellsMap;
  selectedWells: GridCell[];
  selectedWorkflows: Workflow[];
  stagedFiles: UploadFile[];
}

export interface ImagingSessionIdToPlateMap {
  [imagingSessionId: number]: PlateResponse;
}

export interface ImagingSessionIdToWellsMap {
  [imagingSessionId: number]: WellResponse[];
}

export interface UploadFile {
  name: string;
  path: string;
  files: UploadFile[];
  fullPath: string;
  canRead: boolean;
  isDirectory: boolean;
  loadFiles(): Promise<Array<Promise<UploadFile>>>;
}

export interface DeselectFilesAction {
  type: string;
}

export interface ExpandedRows {
  [rowKey: string]: boolean;
}

export interface SelectFileAction {
  payload: string | string[];
  type: string;
}

export interface SelectMetadataAction {
  key: keyof MetadataStateBranch;
  payload: string | number;
  type: string;
}

export interface Well {
  row: number;
  col: number;
  wellId: number;
  cellPopulations: CellPopulation[];
  plateId: number;
  modified?: boolean;
  solutions: Solution[];
}

export interface LoadFilesFromDragAndDropAction extends AutoSaveAction {
  payload: DragAndDropFileList;
  type: string;
}

export interface LoadFilesFromOpenDialogAction extends AutoSaveAction {
  payload: string[];
  type: string;
}

export interface AddStageFilesAction extends AutoSaveAction {
  payload: UploadFile[];
  type: string;
}

export interface UpdateStagedFilesAction extends AutoSaveAction {
  payload: UploadFile[];
  type: string;
}

export interface GetFilesInFolderAction extends AutoSaveAction {
  payload: UploadFile;
  type: string;
}

export interface SelectBarcodeAction extends AutoSaveAction {
  payload: {
    barcode: string;
    imagingSessionIds: Array<number | null>;
  };
  type: string;
}

export interface SelectWorkflowPathAction extends AutoSaveAction {
  type: string;
}

export interface SelectWorkflowsAction {
  payload: Workflow[];
  type: string;
}

export interface SetPlateAction extends AutoSaveAction {
  payload: {
    imagingSessionIds: Array<number | null>;
    plate: ImagingSessionIdToPlateMap;
    wells: ImagingSessionIdToWellsMap;
  };
  type: string;
}

export interface SelectWellsAction {
  payload: GridCell[];
  type: string;
}

export interface SelectAnnotationAction {
  payload: string;
  type: string;
}

export interface SelectUserAction {
  payload: string;
  type: string;
}

export interface DragAndDropFileList {
  readonly length: number;
  [index: number]: DragAndDropFile;
}

export interface DragAndDropFile {
  readonly name: string;
  readonly path: string;
}

export interface JumpToPastSelectionAction extends AutoSaveAction {
  index: number;
  type: string;
}

export interface ClearSelectionHistoryAction extends AutoSaveAction {
  type: string;
}

export interface ClearStagedFilesAction extends AutoSaveAction {
  type: string;
}

export interface ToggleExpandedUploadJobRowAction {
  payload: string;
  type: string;
}

export interface SelectImagingSessionIdAction extends AutoSaveAction {
  payload: number;
  type: string;
}

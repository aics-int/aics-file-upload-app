import {
  CellPopulation,
  Solution,
} from "../../services/metadata-management-service/types";
import {
  AutoSaveAction,
  MassEditRow,
  MetadataStateBranch,
  UploadKeyValue,
} from "../types";

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

export type ManualFileInput = { path: string; name: string };

export interface LoadFilesAction extends AutoSaveAction {
  payload: Array<string | ManualFileInput>;
  type: string;
}

export interface AddRowToDragEventAction {
  payload: {
    id: string;
    index: number;
  };
  type: string;
}

export interface RemoveRowFromDragEventAction {
  payload: string[];
  type: string;
}

export interface StartCellDragAction {
  payload: UploadKeyValue;
  type: string;
}

export interface StopCellDragAction {
  type: string;
}

export interface UpdateMassEditRowAction {
  payload: MassEditRow;
  type: string;
}

export interface StartMassEditAction {
  payload: string[];
  type: string;
}

export interface ApplyMassEditAction {
  type: string;
}

export interface CancelMassEditAction {
  type: string;
}

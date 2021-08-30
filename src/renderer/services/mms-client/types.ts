export interface CreateTemplateAnnotationRequest {
  annotationOptions?: string[];
  annotationTypeId: number;
  description: string;
  name: string;
  lookupColumn?: string;
  lookupSchema?: string;
  lookupTable?: string;
}

export type AnnotationRequest =
  | CreateTemplateAnnotationRequest
  | { annotationId: number };

export interface SaveTemplateRequest {
  name: string;
  annotations: AnnotationRequest[];
}

export interface PopulationEdit {
  cas9BatchId: number;
  cas9BatchName: string;
  crRnaBatchId: number;
  crRnaBatchName: string;
  donorPlasmidBatchId: number;
  donorPlasmidBatchName: string;
}
export interface CellPopulationInfo {
  cellLineId?: number;
  cellLineName?: string;
  cellPopulationId?: number;
  clone?: string;
  edits?: PopulationEdit[];
  passage?: number;
  plateBarcode?: string;
  plateId?: number;
  seedingDensity?: string;
  stageId?: number;
  stageName?: string;
  wellId?: number;
  wellLabel?: string;
}

export interface SolutionLot {
  concentration: number;
  concentrationUnitsId: number;
  concentrationUnitsDisplay?: string;
  dilutionFactorPart: number;
  dilutionFactorTotal: number;
  solutionName: string;
}

export interface CellPopulation {
  seedingDensity: string;
  sourceCellPopulation?: CellPopulationInfo;
  sourcePlateWell?: CellPopulationInfo;
  sourceVial?: {
    barcode: string;
  };
  wellCellPopulation?: CellPopulationInfo;
}

export interface Solution {
  solutionLot: SolutionLot;
  volume: string;
  volumeUnitsId: number;
  volumeUnitDisplay?: string;
}

export interface GetPlateResponse {
  plate: PlateResponse;
  wells: WellResponse[];
}

interface Audited {
  created: Date;
  createdBy: number;
  modifiedBy: number;
  modified: Date;
}

export interface PlateResponse extends Audited {
  barcode: string;
  comments: string;
  imagingSessionId?: number;
  plateGeometryId: number;
  plateId: number;
  plateStatusId: number;
  seededOn?: string; // Date string
}

export interface WellResponse {
  row: number;
  col: number;
  plateId: number;
  wellId: number;
  cellPopulations: CellPopulation[];
  solutions: Solution[];
}

export interface Template extends Audited {
  annotations: TemplateAnnotation[];
  name: string;
  templateId: number;
  version: number;
  createdByDisplayName?: string;
  modifiedByDisplayName?: string;
}

export interface TemplateAnnotation extends Audited {
  annotationId: number;
  annotationOptions?: string[];
  annotationTypeId: number;
  description: string;
  lookupSchema?: string;
  lookupTable?: string;
  orderIndex: number;
  name: string;
  required: boolean;
  createdByDisplayName?: string;
  modifiedByDisplayName?: string;
}

export interface AnnotationMetadataRequest {
  name: string;
  description: string;
  annotationTypeId: number;

  // Lookup Annotations should have these
  lookupSchema?: string;
  lookupTable?: string;
  lookupColumn?: string;

  // Dropdown Annotations should have this
  annotationOptions?: string[];
}

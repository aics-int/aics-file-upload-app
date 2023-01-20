export interface Audited {
  created: Date;
  createdBy: number;
  modified: Date;
  modifiedBy: number;
}

export interface LabkeyAudited {
  Created: string; // Date string
  CreatedBy: number;
  Modified: string; // Date string
  ModifiedBy: number;
}

export interface LabkeyAnnotation extends LabkeyAudited {
  AnnotationId: number;
  AnnotationTypeId: number;
  Name: string;
  "AnnotationTypeId/Name": string;
}

export interface LabkeyAnnotationLookup {
  AnnotationId: number;
  LookupId: number;
}

export interface LabkeyAnnotationOption {
  AnnotationOptionId: number;
  AnnotationId: number;
  Value: string;
}

export interface LabkeyAnnotationType {
  AnnotationTypeId: number;
  Name: string;
}

export interface LabkeyLookup {
  ColumnName: string;
  DescriptionColumn: string;
  LookupId: number;
  SchemaName: string;
  TableName: string;
}

export interface LabkeyPlate {
  BarCode: string;
  ImagingSessionId: number;
}

export interface LabkeyResponse<T> {
  columnModel: Array<{ dataIndex: string }>;
  rowCount: number;
  rows: T[];
}

export interface LabkeyTemplate {
  Name: string;
  TemplateId: number;
  Version: number;
}

export interface LabkeyImagingSession {
  ImagingSessionId: number;
  Name: string;
  Description: string;
}

export interface LabKeyPlateBarcodePrefix {
  PlateBarcodePrefixId: number;
  Prefix: string;
  TeamName: string;
}

export interface LabkeyPlateResponse {
  barcode: string;
  imagingSessionId: number | null;
}

export interface Annotation extends Audited {
  annotationId: number;
  annotationTypeId: number;
  description: string;
  exposeToFileUploadApp?: boolean;
  name: string;
  "annotationTypeId/Name": string;
}

export interface AnnotationLookup {
  annotationId: number;
  lookupId: number;
}

export interface AnnotationOption {
  annotationId: number;
  annotationOptionId: number;
  value: string;
}

export enum ColumnType {
  TEXT = "Text",
  DROPDOWN = "Dropdown",
  BOOLEAN = "YesNo",
  NUMBER = "Number",
  DATE = "Date",
  DATETIME = "DateTime",
  LOOKUP = "Lookup",
  DURATION = "Duration",
}

export enum ScalarType {
  STRING = "string",
  INT = "int",
}

export interface AnnotationType {
  annotationTypeId: number;
  name: ColumnType;
}

export interface Lookup extends Audited {
  columnName: string;
  descriptionColumn: string;
  lookupId: number;
  schemaName: string;
  tableName: string;
  "scalarTypeId/Name": string;
}

export interface BarcodePrefix {
  description: string;
  prefixId: number;
  prefix: string;
}

export interface ImagingSession {
  imagingSessionId: number;
  name: string;
  description: string;
}

export interface Unit {
  description: string;
  name: string;
  type: string;
  unitsId: number;
}

export interface User {
  userId: number;
  displayName: string;
}

export interface LabkeyUnit {
  Type: string;
  Description: string;
  UnitsId: number;
  Name: string;
}

export interface LabKeyResponse<T> {
  rows: T[];
}

export enum FilterType {
  EQUALS = "EQUALS",
  IN = "IN",
}

export interface Filter {
  filterColumn: string;
  searchValue?: any | any[];
  type?: FilterType;
}

export interface LabKeyFileMetadata {
  archiveFilePath?: string;
  filename: string;
  fileId: string;
  fileSize: number;
  fileType: string;
  localFilePath?: string;
  publicFilePath?: string;
  thumbnailLocalFilePath?: string;
  thumbnailId?: string;
  modified: string;
  modifiedBy: string;
}

export enum LK_SCHEMA {
  FILE_METADATA = "filemetadata",
  FMS = "fms",
  MICROSCOPY = "microscopy",
  PROCESSING = "processing",
  UPLOADER = "uploader",
}

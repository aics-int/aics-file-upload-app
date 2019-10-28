import { Audited } from "../types";

export interface TemplateStateBranch {
    appliedTemplate?: Template;
    draft: TemplateDraft;
}

export interface AddExistingAnnotationAction {
    payload: Annotation;
    type: string;
}

export interface Annotation extends Audited {
    annotationId: number;
    annotationTypeId: number;
    description: string;
    name: string;
}

export interface AnnotationDraft {
    annotationId?: number;
    annotationOptions?: string[];
    annotationTypeId: number;
    annotationTypeName: string;
    canHaveManyValues: boolean;
    description?: string;
    index: number;
    name?: string;
    lookupSchema?: string;
    lookupTable?: string;
    required: boolean;
}

export interface AnnotationLookup {
    annotationId: number;
    lookupId: number;
}

export type AnnotationRequest = CreateAnnotationRequest | { annotationId: number };

export interface AnnotationType {
    annotationTypeId: number;
    name: ColumnType;
}

export enum ColumnType {
    TEXT = "Text",
    DROPDOWN = "Dropdown",
    BOOLEAN = "Yes/No",
    NUMBER = "Number",
    DATE = "Date",
    DATETIME = "Date/Time",
    LOOKUP = "Lookup",
}

export interface ClearTemplateDraftAction {
    type: string;
}

export interface CreateAnnotationRequest {
    annotationOptions?: string[];
    annotationTypeId: number;
    canHaveManyValues: boolean;
    description: string;
    name: string;
    lookupColumn?: string;
    lookupSchema?: string;
    lookupTable?: string;
    required: boolean;
}

export interface GetTemplateAction {
    payload: {
        addAnnotationsToUpload: boolean;
        templateId: number;
    };
    type: string;
}

export interface Lookup extends Audited {
    columnName: string;
    descriptionColumn: string;
    lookupId: number;
    schemaName: string;
    tableName: string;
}

export interface RemoveAnnotationsAction {
    payload: number[];
    type: string;
}

export interface SaveTemplateAction {
    type: string;
}

export interface SaveTemplateRequest {
    name: string;
    annotations: AnnotationRequest[];
}

export interface SetAppliedTemplateAction {
    payload: Template;
    type: string;
}

export interface Template extends Audited {
    annotations: TemplateAnnotation[];
    name: string;
    templateId: number;
    version: number;
}

export interface TemplateAnnotation extends Audited {
    annotationId: number;
    annotationOptions?: string[];
    annotationTypeId: number;
    canHaveManyValues: boolean;
    description: string;
    lookupSchema?: string;
    lookupTable?: string;
    name: string;
    required: boolean;
}

export interface TemplateDraft {
    annotations: AnnotationDraft[];
    name?: string;
    templateId?: number;
    version?: number;
}

export interface UpdateTemplateDraftAction {
    payload: Partial<TemplateDraft>;
    type: string;
}
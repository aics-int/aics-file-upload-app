import { DropResult } from "react-beautiful-dnd";

import { Annotation, Audited } from "../../services/labkey-client/types";
import {
  AnnotationMetadataRequest,
  Template,
  TemplateAnnotation,
} from "../../services/metadata-management-service/types";
import {
  AutoSaveAction,
  TemplateDraft,
  UploadStateBranch,
  WriteToStoreAction,
} from "../types";

export interface AddExistingAnnotationAction {
  payload: Annotation;
  type: string;
}

export interface AddExistingTemplateAction {
  payload: number;
  type: string;
}

// if dropdown, annotationOptions array is supplied
export interface AnnotationWithOptions extends Annotation {
  annotationOptions?: string[];
}

export interface ClearTemplateDraftAction {
  type: string;
}

export interface ClearTemplateHistoryAction {
  type: string;
}

export interface CreateAnnotationAction {
  payload: AnnotationMetadataRequest;
  type: string;
}

export interface EditAnnotationAction {
  payload: {
    annotationId: number;
    metadata: AnnotationMetadataRequest;
  };
  type: string;
}

export interface GetTemplateAction {
  payload: {
    addAnnotationsToUpload: boolean;
    templateId: number;
  };
  type: string;
}

export interface JumpToPastTemplateAction {
  index: number;
  type: string;
}

export interface RemoveAnnotationsAction {
  payload: number[];
  type: string;
}

export interface OnTemplateAnnotationDragEndAction {
  payload: DropResult;
  type: string;
}

export interface SaveTemplateAction {
  type: string;
}

export interface SaveTemplateSucceededAction extends WriteToStoreAction {
  payload: number;
  type: string;
}

export interface SetAppliedTemplateAction extends AutoSaveAction {
  payload: {
    template: Template;
    uploads: UploadStateBranch;
  };
  type: string;
}

export interface TemplateAnnotationWithTypeName extends TemplateAnnotation {
  type: string; // name of annotationType
}

export interface TemplateWithTypeNames extends Audited {
  annotations: TemplateAnnotationWithTypeName[];
  name: string;
  templateId: number;
  version: number;
}

export interface UpdateTemplateDraftAction {
  payload: Partial<TemplateDraft>;
  type: string;
}

export interface StartTemplateDraftAction {
  payload: {
    draft: TemplateDraft;
    original: Template;
  };
  type: string;
}

export interface StartTemplateDraftFailedAction {
  payload: string;
  type: string;
}

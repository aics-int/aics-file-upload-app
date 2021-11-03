import { DropResult } from "react-beautiful-dnd";

import { PREFERRED_TEMPLATE_ID } from "../../../shared/constants";
import { Annotation } from "../../services/labkey-client/types";
import {
  AnnotationMetadataRequest,
  Template,
} from "../../services/metadata-management-service/types";
import { TemplateDraft, UploadStateBranch } from "../types";

import {
  ADD_ANNOTATION,
  ADD_EXISTING_TEMPLATE,
  CLEAR_TEMPLATE_DRAFT,
  CREATE_ANNOTATION,
  EDIT_ANNOTATION,
  ON_TEMPLATE_ANNOTATION_DRAG_END,
  REMOVE_ANNOTATIONS,
  SAVE_TEMPLATE,
  SAVE_TEMPLATE_SUCCEEDED,
  SET_APPLIED_TEMPLATE,
  START_TEMPLATE_DRAFT,
  START_TEMPLATE_DRAFT_FAILED,
  UPDATE_TEMPLATE_DRAFT,
} from "./constants";
import {
  AddExistingAnnotationAction,
  AddExistingTemplateAction,
  ClearTemplateDraftAction,
  CreateAnnotationAction,
  EditAnnotationAction,
  OnTemplateAnnotationDragEndAction,
  RemoveAnnotationsAction,
  SaveTemplateAction,
  SaveTemplateSucceededAction,
  SetAppliedTemplateAction,
  StartTemplateDraftAction,
  StartTemplateDraftFailedAction,
  UpdateTemplateDraftAction,
} from "./types";

export function addExistingAnnotation(
  annotation: Annotation
): AddExistingAnnotationAction {
  return {
    payload: annotation,
    type: ADD_ANNOTATION,
  };
}

export function addExistingTemplate(
  templateId: number
): AddExistingTemplateAction {
  return {
    payload: templateId,
    type: ADD_EXISTING_TEMPLATE,
  };
}

export function clearTemplateDraft(): ClearTemplateDraftAction {
  return {
    type: CLEAR_TEMPLATE_DRAFT,
  };
}

export function createAnnotation(
  annotationRequest: AnnotationMetadataRequest
): CreateAnnotationAction {
  return {
    payload: annotationRequest,
    type: CREATE_ANNOTATION,
  };
}

export function editAnnotation(
  annotationId: number,
  metadata: AnnotationMetadataRequest
): EditAnnotationAction {
  return {
    payload: { annotationId, metadata },
    type: EDIT_ANNOTATION,
  };
}

export function removeAnnotations(indexes: number[]): RemoveAnnotationsAction {
  return {
    payload: indexes,
    type: REMOVE_ANNOTATIONS,
  };
}

export function onTemplateAnnotationDragEnd(
  result: DropResult
): OnTemplateAnnotationDragEndAction {
  return {
    payload: result,
    type: ON_TEMPLATE_ANNOTATION_DRAG_END,
  };
}

export function saveTemplate(): SaveTemplateAction {
  return {
    type: SAVE_TEMPLATE,
  };
}

export function saveTemplateSucceeded(
  templateId: number
): SaveTemplateSucceededAction {
  return {
    payload: templateId,
    type: SAVE_TEMPLATE_SUCCEEDED,
    updates: {
      [PREFERRED_TEMPLATE_ID]: templateId,
    },
    writeToStore: true,
  };
}

export function setAppliedTemplate(
  template: Template,
  uploads: UploadStateBranch
): SetAppliedTemplateAction {
  return {
    autoSave: true,
    payload: {
      template,
      uploads,
    },
    type: SET_APPLIED_TEMPLATE,
  };
}

export function updateTemplateDraft(
  draftUpdates: Partial<TemplateDraft>
): UpdateTemplateDraftAction {
  return {
    payload: draftUpdates,
    type: UPDATE_TEMPLATE_DRAFT,
  };
}

export function startTemplateDraft(
  original: Template,
  draft: TemplateDraft
): StartTemplateDraftAction {
  return {
    payload: {
      original,
      draft,
    },
    type: START_TEMPLATE_DRAFT,
  };
}

export function startTemplateDraftFailed(
  error: string
): StartTemplateDraftFailedAction {
  return {
    payload: error,
    type: START_TEMPLATE_DRAFT_FAILED,
  };
}

import { trim } from "lodash";
import { createSelector } from "reselect";

import { AnnotationName } from "../../constants";
import {
  Annotation,
  AnnotationType,
  ColumnType,
} from "../../services/labkey-client/types";
import { Template } from "../../services/metadata-management-service/types";
import { getAnnotations, getAnnotationTypes } from "../metadata/selectors";
import { AnnotationDraft, State, TemplateDraft } from "../types";

import { TemplateWithTypeNames } from "./types";

export const getAppliedTemplate = (state: State) =>
  state.template.appliedTemplate;
export const getTemplateDraft = (state: State) => state.template.draft;
export const getOriginalTemplate = (state: State) => state.template.original;

export const getSaveTemplateRequest = createSelector(
  [getTemplateDraft],
  (draft: TemplateDraft) => {
    return {
      annotations: draft.annotations.map((a: AnnotationDraft) => {
        let annotationOptions: string[] | undefined = (
          a.annotationOptions || []
        )
          .map((o: string) => trim(o))
          .filter((o: string) => !!o);

        if (a.annotationTypeName !== ColumnType.DROPDOWN) {
          annotationOptions = undefined;
        }

        if (a.annotationId) {
          return {
            annotationId: a.annotationId,
            annotationOptions,
            required: a.required,
          };
        }

        return {
          annotationOptions,
          annotationTypeId: a.annotationTypeId,
          description: trim(a.description) || "",
          lookupSchema: a.lookupSchema,
          lookupTable: a.lookupTable,
          name: trim(a.name) || "",
          required: a.required,
        };
      }),
      name: trim(draft.name) || "",
    };
  }
);

// includes annotation info for required fields - well
// and fills out annotation type name
const DEFAULT_ANNOTATION_NAMES = [AnnotationName.NOTES, AnnotationName.WELL];
export const getCompleteAppliedTemplate = createSelector(
  [getAnnotations, getAnnotationTypes, getAppliedTemplate],
  (
    annotations: Annotation[],
    annotationTypes: AnnotationType[],
    appliedTemplate?: Template
  ): TemplateWithTypeNames | undefined => {
    if (!appliedTemplate) {
      return undefined;
    }

    if (!annotationTypes) {
      throw new Error("Missing Annotation Types");
    }

    return {
      ...appliedTemplate,
      annotations: [
        ...DEFAULT_ANNOTATION_NAMES.map((name, index) => {
          const annotation = annotations.find((a) => a.name === name);
          if (!annotation) {
            throw new Error("Could not get necessary annotation information");
          }
          return {
            ...annotation,
            orderIndex: index,
            required: false,
            type: annotation["annotationTypeId/Name"],
          };
        }),
        ...appliedTemplate.annotations.map((a) => {
          const type = annotationTypes.find(
            (at) => at.annotationTypeId === a.annotationTypeId
          );
          if (!type) {
            throw new Error(
              `Could not find annotation type matching annotationTypeId=${a.annotationTypeId}`
            );
          }
          return {
            ...a,
            orderIndex: a.orderIndex + DEFAULT_ANNOTATION_NAMES.length,
            type: type.name,
          };
        }),
      ],
    };
  }
);

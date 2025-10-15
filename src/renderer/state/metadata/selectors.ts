import { uniqBy } from "lodash";
import { createSelector } from "reselect";

import {
  Annotation,
  AnnotationOption,
  AnnotationType,
  ColumnType,
  LabkeyPlateResponse,
  User,
} from "../../services/labkey-client/types";
import { AnnotationWithOptions } from "../template/types";
import { BarcodeSelectorOption, State } from "../types";

// BASIC SELECTORS
export const getMetadata = (state: State) => state.metadata;
export const getAllAnnotations = (state: State) => state.metadata.annotations;
export const getAnnotationIdToHasBeenUsed = (state: State) =>
  state.metadata.annotationIdToHasBeenUsed;
export const getAnnotationLookups = (state: State) =>
  state.metadata.annotationLookups;
export const getAnnotationOptions = (state: State) =>
  state.metadata.annotationOptions;
export const getAnnotationTypes = (state: State) =>
  state.metadata.annotationTypes;
export const getBarcodePrefixes = (state: State) =>
  state.metadata.barcodePrefixes;
export const getBarcodeSearchResults = (state: State) =>
  state.metadata.barcodeSearchResults;
export const getCurrentUploadFilePath = (state: State) =>
  state.metadata.currentUploadFilePath;
export const getImagingSessions = (state: State) =>
  state.metadata.imagingSessions;
export const getLookups = (state: State) => state.metadata.lookups;
export const getOriginalUpload = (state: State) =>
  state.metadata.originalUpload;
export const getPlateBarcodeToPlates = (state: State) =>
  state.metadata.plateBarcodeToPlates;
export const getTemplates = (state: State) => state.metadata.templates;
export const getUnits = (state: State) => state.metadata.units;
export const getUsers = (state: State) => state.metadata.users;
export const getUploadHistory = (state: State) => state.metadata.history.upload;

// Some annotations are used purely for displaying data in the File Explorer, here we exclude those
export const getAnnotations = createSelector(
  [getAllAnnotations],
  (allAnnotations: Annotation[]): Annotation[] =>
    allAnnotations.filter((annotation) => annotation.exposeToFileUploadApp)
);

// COMPOSED SELECTORS
export const getUniqueBarcodeSearchResults = createSelector(
  [getBarcodeSearchResults],
  (allPlates: LabkeyPlateResponse[]): BarcodeSelectorOption[] => {
    const uniquePlateBarcodes = uniqBy(allPlates, "barcode");
    return uniquePlateBarcodes.map((plate) => {
      const imagingSessionIds = allPlates
        .filter((otherPlate) => otherPlate.barcode === plate.barcode)
        .map((p) => p.imagingSessionId);
      return {
        barcode: plate.barcode,
        imagingSessionIds,
      };
    });
  }
);

export const getTemplateIdToName = createSelector(
  [getTemplates],
  (
    templates
  ): {
    [templateId: number]: string;
  } =>
    templates.reduce(
      (accum, template) => ({
        ...accum,
        [template.TemplateId]: `${template.Name} (V${template.Version})`,
      }),
      {} as { [templateId: number]: string }
    )
);

const getAnnotationTypeId = (annotationTypeName: ColumnType) =>
  createSelector([getAnnotationTypes], (annotationTypes: AnnotationType[]) => {
    const annotationType = annotationTypes.find(
      (at) => at.name === annotationTypeName
    );
    return annotationType ? annotationType.annotationTypeId : undefined;
  });

export const getBooleanAnnotationTypeId = getAnnotationTypeId(
  ColumnType.BOOLEAN
);
export const getDropdownAnnotationTypeId = getAnnotationTypeId(
  ColumnType.DROPDOWN
);
export const getLookupAnnotationTypeId = getAnnotationTypeId(ColumnType.LOOKUP);
export const getNumberAnnotationTypeId = getAnnotationTypeId(ColumnType.NUMBER);
export const getTextAnnotationTypeId = getAnnotationTypeId(ColumnType.TEXT);
export const getDurationAnnotationTypeId = getAnnotationTypeId(
  ColumnType.DURATION
);
export const getDateAnnotationTypeId = getAnnotationTypeId(ColumnType.DATE);
export const getDateTimeAnnotationTypeId = getAnnotationTypeId(
  ColumnType.DATETIME
);

export const getAnnotationsWithAnnotationOptions = createSelector(
  [getAnnotations, getAnnotationOptions],
  (
    annotations: Annotation[],
    annotationOptions: AnnotationOption[]
  ): AnnotationWithOptions[] => {
    return annotations
      .map((a) => {
        const options = annotationOptions
          .filter((o) => o.annotationId === a.annotationId)
          .map((o) => o.value);
        return {
          ...a,
          annotationOptions: options.length ? options : undefined,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }
);

export const getUserIdToDisplayName = createSelector(
  [getUsers],
  (users: User[]): { [userId: number]: string } =>
    users.reduce(
      (accum, user) => ({
        ...accum,
        [user.userId]: user.displayName,
      }),
      {}
    )
);

export const getProgramOptions = (state: State) =>
  state.metadata.programOptions;

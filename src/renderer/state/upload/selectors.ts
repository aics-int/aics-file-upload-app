import { basename, extname } from "path";

import {
  castArray,
  difference,
  forEach,
  isArray,
  isEmpty,
  isEqual,
  isNil,
  keys,
  mapValues,
  omit,
  uniq,
} from "lodash";
import { isDate } from "moment";
import * as moment from "moment";
import { createSelector } from "reselect";

import {
  AnnotationName,
  DAY_AS_MS,
  HOUR_AS_MS,
  LIST_DELIMITER_SPLIT,
  MINUTE_AS_MS,
  PROGRAM_ANNOTATION_ID,
} from "../../constants";
import { ColumnType } from "../../services/labkey-client/types";
import { UploadRequest } from "../../services/types";
import { Duration } from "../../types";
import { extensionToFileTypeMap } from "../../util";
import {
  getBooleanAnnotationTypeId,
  getDateAnnotationTypeId,
  getDateTimeAnnotationTypeId,
  getDropdownAnnotationTypeId,
  getDurationAnnotationTypeId,
  getLookupAnnotationTypeId,
  getNumberAnnotationTypeId,
  getOriginalUpload,
  getPlateBarcodeToPlates,
  getTextAnnotationTypeId,
} from "../metadata/selectors";
import { getShouldBeInLocal } from "../selection/selectors";
import { getCompleteAppliedTemplate } from "../template/selectors";
import {
  TemplateAnnotationWithTypeName,
  TemplateWithTypeNames,
} from "../template/types";
import { State, FileModel, UploadStateBranch } from "../types";

import { FileType, MMSAnnotationValueRequest } from "./types";

export const getUpload = (state: State) => state.upload.present;
export const getCurrentUploadIndex = (state: State) => state.upload.index;
export const getUploadPast = (state: State) => state.upload.past;
export const getUploadFuture = (state: State) => state.upload.future;

export const getCanRedoUpload = createSelector(
  [getUploadFuture],
  (future: UploadStateBranch[]) => {
    return !isEmpty(future);
  }
);

export const getCanUndoUpload = createSelector(
  [getCurrentUploadIndex],
  (currentUploadIndex) => {
    return currentUploadIndex !== undefined && currentUploadIndex > 0;
  }
);

const EXCLUDED_UPLOAD_FIELDS = ["file", "key"];

// this matches the metadata annotations to the ones in the database and removes
// extra stuff that does not have annotations associated with it but is needed for UI display
const removeExcludedFields = (metadata: FileModel) =>
  omit(metadata, EXCLUDED_UPLOAD_FIELDS);

// Maps UploadRequest to shape of data needed by react-table
export const getUploadAsTableRows = createSelector(
  [getUpload],
  (upload): FileModel[] =>
    Object.values(upload).map((fileMetadata) => ({
      ...fileMetadata,
      [AnnotationName.IMAGING_SESSION]:
        fileMetadata[AnnotationName.IMAGING_SESSION] || [],
      [AnnotationName.NOTES]: fileMetadata[AnnotationName.NOTES] || [],
      [AnnotationName.PLATE_BARCODE]:
        fileMetadata[AnnotationName.PLATE_BARCODE] || [],
      [AnnotationName.WELL]: fileMetadata[AnnotationName.WELL] || [],
    }))
);

export const getFileToAnnotationHasValueMap = createSelector(
  [getUpload],
  (fileToMetadataMap): { [file: string]: { [annotation: string]: boolean } } =>
    mapValues(fileToMetadataMap, (fileMetadata) =>
      mapValues(fileMetadata, (annotationValue) =>
        isArray(annotationValue)
          ? !isEmpty(annotationValue)
          : !isNil(annotationValue)
      )
    )
);

export const getUploadKeyToAnnotationErrorMap = createSelector(
  [
    getUpload,
    getDropdownAnnotationTypeId,
    getLookupAnnotationTypeId,
    getBooleanAnnotationTypeId,
    getNumberAnnotationTypeId,
    getTextAnnotationTypeId,
    getDurationAnnotationTypeId,
    getDateAnnotationTypeId,
    getDateTimeAnnotationTypeId,
    getCompleteAppliedTemplate,
  ],
  (
    upload: UploadStateBranch,
    dropdownAnnotationTypeId?: number,
    lookupAnnotationTypeId?: number,
    booleanAnnotationTypeId?: number,
    numberAnnotationTypeId?: number,
    textAnnotationTypeId?: number,
    durationAnnotationTypeId?: number,
    dateAnnotationTypeId?: number,
    dateTimeAnnotationTypeId?: number,
    template?: TemplateWithTypeNames
  ): { [key: string]: { [annotation: string]: string } } => {
    if (!template) {
      return {};
    }

    const result: any = {};
    forEach(upload, (metadata, key) => {
      const annotationToErrorMap: { [annotation: string]: string } = {};
      forEach(
        removeExcludedFields(metadata),
        (value: any, annotationName: string) => {
          const templateAnnotation = template.annotations.find(
            (a) => a.name === annotationName
          );
          if (!isNil(value) && templateAnnotation) {
            if (!Array.isArray(value)) {
              annotationToErrorMap[annotationName] =
                "Invalid format, expected list";
            } else {
              value = castArray(value);
              let invalidValues;
              switch (templateAnnotation.annotationTypeId) {
                case dropdownAnnotationTypeId:
                case lookupAnnotationTypeId:
                  if (templateAnnotation.annotationOptions) {
                    invalidValues = difference(
                      value,
                      templateAnnotation.annotationOptions
                    ).join(", ");
                    if (invalidValues) {
                      const expected =
                        templateAnnotation.annotationOptions.join(", ");
                      annotationToErrorMap[
                        annotationName
                      ] = `${invalidValues} did not match any of the expected values: ${expected}`;
                    }
                  }
                  break;
                case booleanAnnotationTypeId:
                  invalidValues = value
                    .filter((v: any) => typeof v !== "boolean")
                    .join(", ");
                  if (invalidValues) {
                    annotationToErrorMap[
                      annotationName
                    ] = `${invalidValues} did not match expected type: YesNo`;
                  }
                  break;
                case numberAnnotationTypeId:
                  if (
                    value.length > 0 &&
                    `${value[0]}`.trim().endsWith(LIST_DELIMITER_SPLIT)
                  ) {
                    annotationToErrorMap[annotationName] =
                      "value cannot end with a comma";
                  } else {
                    invalidValues = value
                      .filter((v: any) => typeof v !== "number")
                      .join(", ");
                    if (invalidValues) {
                      annotationToErrorMap[
                        annotationName
                      ] = `${invalidValues} did not match expected type: Number`;
                    }
                  }

                  break;
                case textAnnotationTypeId:
                  if (
                    value.length > 0 &&
                    `${value[0]}`.trim().endsWith(LIST_DELIMITER_SPLIT)
                  ) {
                    annotationToErrorMap[annotationName] =
                      "value cannot end with a comma";
                  } else {
                    invalidValues = value
                      .filter((v: any) => typeof v !== "string")
                      .join(", ");
                    if (invalidValues) {
                      annotationToErrorMap[
                        annotationName
                      ] = `${invalidValues} did not match expected type: Text`;
                    }
                  }
                  break;
                case durationAnnotationTypeId:
                  if (value.length > 1) {
                    annotationToErrorMap[
                      annotationName
                    ] = `Only one Duration value may be present`;
                  } else if (value.length === 1) {
                    const { days, hours, minutes, seconds } =
                      value[0] as Duration;

                    if (
                      [days, hours, minutes, seconds].some(
                        (v) => typeof v !== "number" || v < 0
                      )
                    ) {
                      annotationToErrorMap[
                        annotationName
                      ] = `A Duration may only include numbers greater than 0`;
                    }
                  }
                  break;
                case dateTimeAnnotationTypeId:
                case dateAnnotationTypeId:
                  invalidValues = value
                    .filter((v: any) => !isDate(v))
                    .join(", ");
                  if (invalidValues) {
                    annotationToErrorMap[
                      annotationName
                    ] = `${invalidValues} did not match expected type: Date or DateTime`;
                  }
                  break;
                default:
                  annotationToErrorMap[annotationName] = "Unexpected data type";
                  break;
              }
            }
          }
        }
      );

      if (keys(annotationToErrorMap).length) {
        result[key] = annotationToErrorMap;
      }
    });
    return result;
  }
);

/**
 * This selector validates that a template has been selected, there are uploads,
 * and enforces that each file in an upload batch:
 *    - have a well id defined if user has not explicitly noted
 *      that they do not have a plate
 *    - have values for all annotations required by template
 *    - have values for annotations that match the expected type
 */
export const getUploadValidationErrors = createSelector(
  [
    getUploadAsTableRows,
    getFileToAnnotationHasValueMap,
    getUploadKeyToAnnotationErrorMap,
    getPlateBarcodeToPlates,
    getCompleteAppliedTemplate,
  ],
  (
    rows,
    fileToAnnotationHasValueMap,
    validationErrorsMap,
    plateBarcodeToPlates,
    template?
  ): string[] => {
    if (!template) {
      return [];
    }
    const errors: string[] = [];
    // Iterate over each row value adding an error for each value with a non-ASCII character
    rows.forEach((row) => {
      Object.entries(row).forEach(([rowKey, rowValue]) => {
        const rowValues = isArray(rowValue) ? rowValue : [rowValue];
        rowValues.forEach((individualRowValue) => {
          // Checks if the value has any non-ASCII characters
          if (
            typeof individualRowValue === "string" &&
            /[^\0-\x7F]/.exec(individualRowValue)
          ) {
            errors.push(
              `Annotations cannot have special characters like in "${individualRowValue}" for ${rowKey}`
            );
          }
        });
      });
    });
    const requiredAnnotations = template.annotations
      .filter((a) => a.required)
      .map((a) => a.name);
    forEach(
      fileToAnnotationHasValueMap,
      (annotationHasValueMap: { [key: string]: boolean }, file: string) => {
        const fileName = basename(file);
        const requiredAnnotationsThatDontHaveValues =
          requiredAnnotations.filter(
            (annotation) => !annotationHasValueMap[annotation]
          );
        if (annotationHasValueMap[AnnotationName.PLATE_BARCODE]) {
          if (!annotationHasValueMap[AnnotationName.IMAGING_SESSION]) {
            const plateBarcode = rows.find((r) => r.file === file)?.[
              AnnotationName.PLATE_BARCODE
            ]?.[0];
            const plateInfoForBarcode =
              plateBarcodeToPlates[plateBarcode || ""];
            // If there are imaging sessions to choose from then the user should have to
            if (plateInfoForBarcode?.find((p) => !!p.name)) {
              requiredAnnotationsThatDontHaveValues.push(
                AnnotationName.IMAGING_SESSION
              );
            }
          }
          if (!annotationHasValueMap[AnnotationName.WELL]) {
            requiredAnnotationsThatDontHaveValues.push(AnnotationName.WELL);
          }
        }

        if (!annotationHasValueMap[AnnotationName.PROGRAM]) {
          requiredAnnotationsThatDontHaveValues.push(AnnotationName.PROGRAM);
        }

        if (requiredAnnotationsThatDontHaveValues.length) {
          const requiredAnnotationsMissingNames =
            requiredAnnotationsThatDontHaveValues.join(", ");
          errors.push(
            `"${fileName}" is missing the following required annotations: ${requiredAnnotationsMissingNames}`
          );
        }
      }
    );

    if (keys(validationErrorsMap).length) {
      errors.push(
        "Unexpected format for annotation type. Hover red x icons for more information."
      );
    }

    return errors;
  }
);

// the userData relates to the same file
export const getAnnotations = (
  fileMetadata: FileModel,
  appliedTemplate: TemplateWithTypeNames
): MMSAnnotationValueRequest[] => {
  const annotationNameToAnnotationMap: {
    [name: string]: TemplateAnnotationWithTypeName;
  } = appliedTemplate.annotations.reduce(
    (accum, annotation) => ({
      ...accum,
      [annotation.name]: annotation,
    }),
    {}
  );

  const customData = removeExcludedFields(fileMetadata);
  const annotations = Object.entries(customData).reduce(
    (annotationsAccum, [annotationName, value]) => {
      const annotation = annotationNameToAnnotationMap[annotationName];
      if (annotation) {
        // Special case where no value for a boolean type is the same as
        // declaring the value False
        if (annotation.type === ColumnType.BOOLEAN && isEmpty(value)) {
          value = [false];
        }

        // Special case for FMS.File Lookup types
        // We expect 'value' to be an array of strings like "<file name> (FileIdOf32CharactersAAAAAAAAAAAA)"
        // However, we only want the fileIDs for the upload
        if (
          annotation.type === ColumnType.LOOKUP &&
          annotation.lookupTable === "file"
        ) {
          value = value.map((fileEntry: string) => {
            const re = RegExp(/\(([a-zA-Z0-9]{32})\)$/); // Find the FileID in parentheses and capture it
            const match = re.exec(fileEntry);
            if (match && match.length === 2) {
              return match[1]; // return captured ID
            }
            return fileEntry;
          });
        }

        const isValuePresent = Array.isArray(value)
          ? !isEmpty(value)
          : !isNil(value);

        if (isValuePresent) {
          annotationsAccum.push({
            annotationId: annotation.annotationId,
            values: castArray(value).map((v) => {
              if (annotation.type === ColumnType.DATETIME) {
                return moment(v).format(); // ISO string w/ timezone offset
              }
              if (annotation.type === ColumnType.DATE) {
                return moment(v).format("YYYY-MM-DD");
              }
              if (annotation.type === ColumnType.DURATION) {
                const { days, hours, minutes, seconds } = v as Duration;
                return (
                  days * DAY_AS_MS +
                  hours * HOUR_AS_MS +
                  minutes * MINUTE_AS_MS +
                  seconds * 1000
                ).toString();
              }

              return v.toString();
            }),
          });
        }
      } else {
        // tslint:disable-next-line
        console.warn(
          `Found annotation named ${annotationName} that is not in template`
        );
      }

      return annotationsAccum;
    },
    [] as MMSAnnotationValueRequest[]
  );
  const programValue = fileMetadata[AnnotationName.PROGRAM];
  const programPresent = Array.isArray(programValue)
    ? !isEmpty(programValue)
    : !isNil(programValue);

  if (programPresent) {
    const alreadyIncluded = annotations.some(
      (ann) => ann.annotationId === PROGRAM_ANNOTATION_ID
    );
    if (!alreadyIncluded) {
      annotations.push({
        annotationId: PROGRAM_ANNOTATION_ID,
        values: castArray(programValue),
      });
    }
  }

  return annotations;
};

export const getUploadRequests = createSelector(
  [getUpload, getCompleteAppliedTemplate, getShouldBeInLocal],
  (
    uploads: UploadStateBranch,
    template?: TemplateWithTypeNames,
    ShouldBeInLocal?: boolean,
  ): UploadRequest[] => {
    if (!template) {
      throw new Error("Template has not been applied");
    }

    return Object.entries(uploads).map(([filePath, fileMetadata]) => ({
      customMetadata: {
        annotations: getAnnotations(fileMetadata, template),
        templateId: template.templateId,
      },
      file: {
        disposition: "tape", // prevent czi -> ome.tiff conversions
        ...(fileMetadata.fileId && { fileId: fileMetadata.fileId }),
        fileType:
          extensionToFileTypeMap[extname(filePath).toLowerCase()] ||
          FileType.OTHER,
        originalPath: filePath,
        shouldBeInArchive: true,
        shouldBeInLocal: ShouldBeInLocal,
        uploadType: fileMetadata.uploadType
      },
      // To support the current way of storing metadata in bob the blob, we continue to include
      // wellIds in the microscopy block.
      microscopy: {
        ...(fileMetadata[AnnotationName.WELL]?.length && {
          wellIds: fileMetadata[AnnotationName.WELL],
        }),
      },
    }));
  }
);

export const getUploadFileNames = createSelector(
  [getUpload],
  (upload: UploadStateBranch): string[] =>
    uniq(Object.values(upload).map(({ file }) => basename(file))).sort()
);

export const getCanSaveUploadDraft = createSelector(
  [getUpload, getOriginalUpload],
  (upload: UploadStateBranch, originalUpload?: UploadStateBranch) => {
    if (!originalUpload) {
      return !isEmpty(upload);
    }
    return !isEqual(originalUpload, upload);
  }
);

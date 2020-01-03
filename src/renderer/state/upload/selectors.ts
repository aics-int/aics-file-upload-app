import { Uploads } from "@aics/aicsfiles/type-declarations/types";
import {
    castArray,
    flatMap,
    forEach,
    groupBy,
    isArray,
    isEmpty,
    isNil,
    keys,
    map,
    omit,
    pick,
    some,
    uniq,
    values,
    without,
} from "lodash";
import * as moment from "moment";
import { basename, extname } from "path";
import { createSelector } from "reselect";

import { LIST_DELIMITER_JOIN } from "../../constants";
import { titleCase } from "../../util";

import { getExpandedUploadJobRows } from "../selection/selectors";

import { ExpandedRows } from "../selection/types";
import { getCompleteAppliedTemplate } from "../template/selectors";
import { ColumnType, TemplateWithTypeNames } from "../template/types";
import { State } from "../types";
import { getUploadRowKey, isChannelOnlyRow, isFileRow, isSceneOnlyRow, isSceneRow } from "./constants";
import {
    FilepathToBoolean,
    FileType,
    MMSAnnotationValueRequest,
    UploadJobTableRow,
    UploadMetadata,
    UploadStateBranch,
} from "./types";

export const getUpload = (state: State) => state.upload.present;
export const getCurrentUploadIndex = (state: State) => state.upload.index;
export const getUploadPast = (state: State) => state.upload.past;
export const getUploadFuture = (state: State) => state.upload.future;

export const getAppliedTemplateId = createSelector([getUpload], (uploads: UploadStateBranch): number | undefined =>
    Object.keys(uploads).length ? uploads[Object.keys(uploads)[0]].templateId : undefined
);

export const getCanRedoUpload = createSelector([getUploadFuture], (future: UploadStateBranch[]) => {
    return !isEmpty(future);
});

export const getCanUndoUpload = createSelector([getUploadPast], (past: UploadStateBranch[]) => {
    return !isEmpty(past);
});

const EXCLUDED_UPLOAD_FIELDS = [
    "barcode",
    "channel",
    "file",
    "key",
    "plateId",
    "positionIndex",
    "shouldBeInArchive",
    "shouldBeInLocal",
    "templateId",
    "wellLabels",
];

// this matches the metadata annotations to the ones in the database and removes
// extra stuff that does not have annotations associated with it but is needed for UI display
const standardizeUploadMetadata = (metadata: UploadMetadata) => {
    const strippedMetadata = omit(metadata, EXCLUDED_UPLOAD_FIELDS);
    const result: any = {};
    forEach(strippedMetadata, (value: any, key: string) => {
        result[titleCase(key)] = value;
    });

    return result;
};

const convertToUploadJobRow = (
    metadata: UploadMetadata,
    numberSiblings: number,
    siblingIndex: number,
    treeDepth: number,
    template?: TemplateWithTypeNames,
    hasSubRows: boolean = false,
    channelIds: number[] = [],
    positionIndexes: number[] = []
): UploadJobTableRow => {
    // convert arrays to strings
    const formattedMetadata: UploadMetadata = {...metadata};
    if (template) {
        forEach(standardizeUploadMetadata(metadata), (value: any, key: string) => {
            const templateAnnotation = template.annotations.find((a) => a.name === key);

            if (!templateAnnotation) {
                throw new Error("Could not get template annotation named " + key);
            }

            const { type } = templateAnnotation;
            // When a text or number annotation has supports multiple values, the editor will be
            // an Input so we need to convert arrays to strings
            const formatList = templateAnnotation && templateAnnotation.canHaveManyValues && Array.isArray(value) &&
                (type === ColumnType.TEXT || type === ColumnType.NUMBER);
            if (formatList) {
                formattedMetadata[key] = value.join(LIST_DELIMITER_JOIN);
            }
        });
    }

    return {
        ...formattedMetadata,
        channelIds,
        group: hasSubRows,
        key: getUploadRowKey(metadata.file, metadata.positionIndex,
            metadata.channel ? metadata.channel.channelId : undefined),
        numberSiblings,
        positionIndexes,
        siblingIndex,
        treeDepth,
        wellLabels: metadata.wellLabels ? metadata.wellLabels.sort().join(LIST_DELIMITER_JOIN) : "",
        workflows: metadata.workflows ? metadata.workflows.join(LIST_DELIMITER_JOIN) : "",
    };
};

// there will be metadata for files, each scene in a file, each channel in a file, and every combo
// of scenes + channels
const getFileToMetadataMap = createSelector([
    getUpload,
], (uploads: UploadStateBranch): { [file: string]: UploadMetadata[] } => {
    return groupBy(values(uploads), ({file}: UploadMetadata) => file);
});

const getChannelOnlyRows = (allMetadataForFile: UploadMetadata[], template?: TemplateWithTypeNames,
                            treeDepth: number = 1) => {
    const channelMetadata = allMetadataForFile.filter(isChannelOnlyRow);
    const sceneOnlyRows = allMetadataForFile.filter(isSceneOnlyRow);
    return channelMetadata.map((c: UploadMetadata, siblingIndex: number) =>
        convertToUploadJobRow(
            c,
            channelMetadata.length + sceneOnlyRows.length,
            siblingIndex,
            treeDepth,
            template
        ));
};

const getSceneChannelRows = (allMetadataForPositionIndex: UploadMetadata[],
                             treeDepth: number,
                             sceneParentMetadata?: UploadMetadata,
                             template?: TemplateWithTypeNames) => {
    const sceneChannelMetadata = sceneParentMetadata ? without(allMetadataForPositionIndex, sceneParentMetadata)
        : allMetadataForPositionIndex;
    return sceneChannelMetadata
        .map((u: UploadMetadata, sceneChannelSiblingIndex: number) =>
            convertToUploadJobRow(u, sceneChannelMetadata.length,
                sceneChannelSiblingIndex, treeDepth, template));
};

const getSceneRows = (allMetadataForFile: UploadMetadata[],
                      numberChannelOnlyRows: number,
                      expandedRows: ExpandedRows, file: string,
                      sceneRowTreeDepth: number,
                      template?: TemplateWithTypeNames
                      ) => {
    const sceneRows: UploadJobTableRow[] = [];
    const sceneMetadata = allMetadataForFile.filter(isSceneRow);
    const metadataGroupedByScene = groupBy(sceneMetadata, ({positionIndex}: UploadMetadata) => positionIndex);
    const numberSiblingsUnderFile = numberChannelOnlyRows + keys(metadataGroupedByScene).length;

    forEach(values(metadataGroupedByScene),
        (allMetadataForPositionIndex: UploadMetadata[], sceneIndex: number) => {
            const sceneParentMetadata = allMetadataForPositionIndex.find((m) => isNil(m.channel));
            if (sceneParentMetadata) {
                const sceneRow = convertToUploadJobRow(
                    sceneParentMetadata,
                    numberSiblingsUnderFile,
                    sceneIndex + numberChannelOnlyRows,
                    sceneRowTreeDepth,
                    template,
                    allMetadataForPositionIndex.length > 1
                );
                sceneRows.push(sceneRow);

                if (expandedRows[getUploadRowKey(file, sceneParentMetadata.positionIndex)]) {
                    sceneRows.push(...getSceneChannelRows(allMetadataForPositionIndex, sceneRowTreeDepth + 1,
                        sceneParentMetadata, template));
                }
            } else {
                sceneRows.push(...getSceneChannelRows(allMetadataForPositionIndex, sceneRowTreeDepth,
                    sceneParentMetadata, template));
            }
        });

    return sceneRows;
};

// maps uploadMetadata to shape of data needed by react-data-grid including information about how to display subrows
export const getUploadSummaryRows = createSelector([
    getUpload,
    getExpandedUploadJobRows,
    getFileToMetadataMap,
    getCompleteAppliedTemplate,
], (uploads: UploadStateBranch, expandedRows: ExpandedRows,
    metadataGroupedByFile: { [file: string]: UploadMetadata[] },
    template?: TemplateWithTypeNames): UploadJobTableRow[] => {
    // contains only rows that are visible (i.e. rows whose parents are expanded)
    const visibleRows: UploadJobTableRow[] = [];

    // populate visibleRows
    let fileSiblingIndex = -1;
    forEach(metadataGroupedByFile, (allMetadataForFile: UploadMetadata[], file: string) => {
        fileSiblingIndex++;
        const fileMetadata = allMetadataForFile.find(isFileRow);
        const treeDepth = fileMetadata ? 1 : 0;
        const channelRows = getChannelOnlyRows(allMetadataForFile, template, treeDepth);
        const sceneRows = getSceneRows(allMetadataForFile, channelRows.length, expandedRows, file, treeDepth, template);

        if (fileMetadata) {
            // file rows are always visible
            const hasSubRows = channelRows.length + sceneRows.length > 0;
            const allChannelIds = uniq(allMetadataForFile
                .filter((m: UploadMetadata) => !!m.channel)
                .map((m: UploadMetadata) => m.channel!.channelId));
            const allPositionIndexes: number[] = uniq(allMetadataForFile
                .filter((m: UploadMetadata) => !isNil(m.positionIndex))
                .map((m: UploadMetadata) => m.positionIndex)) as number[];
            const fileRow = convertToUploadJobRow(fileMetadata, keys(metadataGroupedByFile).length, fileSiblingIndex,
                0, template, hasSubRows, allChannelIds, allPositionIndexes);
            visibleRows.push(fileRow);

            if (expandedRows[getUploadRowKey(file)]) {
                visibleRows.push(
                    ...channelRows,
                    ...sceneRows
                );
            }
        } else {
            visibleRows.push(
                ...channelRows,
                ...sceneRows
            );
        }
    });

    return visibleRows;
});

export const getFileToAnnotationHasValueMap = createSelector([getFileToMetadataMap],
    (metadataGroupedByFile: { [file: string]: UploadMetadata[] }) => {
        const result: { [file: string]: { [key: string]: boolean } } = {};
        forEach(metadataGroupedByFile, (allMetadata: UploadMetadata[], file: string) => {
            result[file] = allMetadata.reduce((accum: { [key: string]: boolean }, curr: UploadMetadata) => {
                forEach(curr, (value: any, key: string) => {
                    const currentValueIsEmpty = isArray(value) ? isEmpty(value) : isNil(value);
                    accum[key] = accum[key] || !currentValueIsEmpty;
                });

                return accum;
            }, {});
        });
        return result;
    }
);

export const getValidationErrorsMap = createSelector([
    getUpload,
    getCompleteAppliedTemplate,
], (upload: UploadStateBranch, template?: TemplateWithTypeNames) => {
    if (!template) {
        return {};
    }

    const result: any = {};
    forEach(upload, (metadata: UploadMetadata, key: string) => {
        const annotationToErrorMap: {[annotation: string]: string} = {};
        forEach(standardizeUploadMetadata(metadata), (value: any, annotationName: string) => {
            const templateAnnotation = template.annotations.find((a) => a.name === annotationName);
            if (templateAnnotation) {
                if (templateAnnotation.canHaveManyValues && !isNil(value) && !Array.isArray(value)) {
                    annotationToErrorMap[annotationName] = "Invalid format";
                }
            }
        });

        if (keys(annotationToErrorMap).length) {
            result[key] = annotationToErrorMap;
        }
    });
    return result;
});

export const getCanSave = createSelector([
    getUploadSummaryRows,
    getFileToAnnotationHasValueMap,
    getValidationErrorsMap,
    getCompleteAppliedTemplate,
], (
    rows: UploadJobTableRow[],
    fileToAnnotationHasValueMap: {[file: string]: {[key: string]: boolean}},
    validationErrorsMap: {[key: string]: {[annotation: string]: string}},
    template?: TemplateWithTypeNames
): boolean => {
    if (!template || !rows.length) {
        return false;
    }

    if (keys(validationErrorsMap).length) {
        return false;
    }

    const requiredAnnotations = template.annotations.filter((a) => a.required).map((a) => a.name);
    let isValid = true;
    forEach(fileToAnnotationHasValueMap, (annotationHasValueMap: {[key: string]: boolean}) => {
        if (!annotationHasValueMap.wellIds && !annotationHasValueMap.workflows) {
            isValid = false;
        }
        const onlyRequiredAnnotations = pick(annotationHasValueMap, requiredAnnotations);
        const valuesOfRequired = values(onlyRequiredAnnotations);
        const aFalseExists = some(valuesOfRequired, (x) => !x);
        if (aFalseExists) {
            isValid = false;
        }
    });

    return isValid;
});

// the userData relates to the same file but differs for scene/channel combinations
const getAnnotations = (
    metadata: UploadMetadata[],
    appliedTemplate: TemplateWithTypeNames
): MMSAnnotationValueRequest[] => {
    return flatMap(metadata, (metadatum: UploadMetadata) => {
        const customData = standardizeUploadMetadata(metadatum);
        const result: MMSAnnotationValueRequest[] = [];
        forEach(customData, (value: any, annotationName: string) => {
            const addAnnotation = Array.isArray(value) ? !isEmpty(value) : !isNil(value);
            if (addAnnotation) {
                annotationName = titleCase(annotationName);
                const annotation = appliedTemplate.annotations
                    .find((a) => a.name === annotationName);
                if (!annotation) {
                    throw new Error(
                        `Could not find an annotation named ${annotationName} in your template`
                    );
                }

                result.push({
                    annotationId: annotation.annotationId,
                    channelId: metadatum.channel ? metadatum.channel.channelId : undefined,
                    positionIndex: metadatum.positionIndex,
                    timePointId: undefined,
                    values: castArray(value).map((v) => {
                        if (annotation.type === ColumnType.DATETIME) {
                            return moment(v).format("YYYY-MM-DD HH:mm:ss");
                        } else if (annotation.type === ColumnType.DATE) {
                            return moment(v).format("YYYY-MM-DD");
                        }
                        return v.toString();
                    }),
                });
            }
        });
        return result;
    });
};

const extensionToFileTypeMap: { [index: string]: FileType } = {
    ".csv": FileType.CSV,
    ".czexp": FileType.ZEISS_CONFIG_FILE,
    ".czi": FileType.IMAGE,
    ".czmbi": FileType.ZEISS_CONFIG_FILE,
    ".czsh": FileType.ZEISS_CONFIG_FILE,
    ".gif": FileType.IMAGE,
    ".jpeg": FileType.IMAGE,
    ".jpg": FileType.IMAGE,
    ".pdf": FileType.IMAGE, // TODO: decide if we consider this to be true
    ".png": FileType.IMAGE,
    ".tif": FileType.IMAGE,
    ".tiff": FileType.IMAGE,
    ".txt": FileType.TEXT,
};

export const getUploadPayload = createSelector([
    getUpload,
    getCompleteAppliedTemplate,
], (uploads: UploadStateBranch, template?: TemplateWithTypeNames): Uploads => {
    if (!template) {
        throw new Error("Template has not been applied");
    }

    let result = {};
    const metadataGroupedByFile = groupBy(values(uploads), "file");
    forEach(metadataGroupedByFile, (metadata: UploadMetadata[], fullPath: string) => {
        // to support the current way of storing metadata in bob the blob, we continue to include
        // wellIds and workflows in the microscopy block. Since a file may have 1 or more scenes and channels
        // per file, we set these values to a uniq list of all of the values found across each "dimension"
        const wellIds = uniq(flatMap(metadata, (m) => m.wellIds)).filter((w) => !!w);
        const workflows = uniq(flatMap(metadata, (m) => m.workflows || [])).filter((w) => !!w);
        const fileRows = metadata.filter(isFileRow);
        const shouldBeInArchive = fileRows.length && !isNil(fileRows[0].shouldBeInArchive) ?
            fileRows[0].shouldBeInArchive : true;
        const shouldBeInLocal = fileRows.length && !isNil(fileRows[0].shouldBeInLocal) ?
            fileRows[0].shouldBeInLocal : true;
        result = {
            ...result,
            [fullPath]: {
                customMetadata: {
                    annotations: getAnnotations(metadata, template),
                    templateId: template.templateId,
                },
                file: {
                    fileType: extensionToFileTypeMap[extname(fullPath).toLowerCase()] || FileType.OTHER,
                    originalPath: fullPath,
                    shouldBeInArchive,
                    shouldBeInLocal,
                },
                microscopy: {
                    ...(wellIds.length && { wellIds }),
                    ...(workflows.length && { workflows }),
                },
            },
        };
    });

    return result;
});

export const getUploadFileNames = createSelector([
    getUpload,
], (upload: UploadStateBranch): string => (
    map(upload, (metadata, filePath) => basename(filePath)).join(", ")
));

export const getUploadFiles = createSelector([
    getUpload,
], (upload: UploadStateBranch) => uniq(values(upload).map((u: UploadMetadata) => u.file)));

export const getFileToArchive = createSelector([
    getUpload,
], (upload: UploadStateBranch) =>
    values(upload)
        .filter(isFileRow)
        .reduce((accum: FilepathToBoolean, {file, shouldBeInArchive}: UploadMetadata) => ({
            ...accum,
            [file]: Boolean(shouldBeInArchive),
        }), {})
);

export const getFileToStoreOnIsilon = createSelector([
    getUpload,
], (upload: UploadStateBranch) =>
    values(upload)
        .filter(isFileRow)
        .reduce((accum: FilepathToBoolean, {file, shouldBeInLocal}: UploadMetadata) => ({
            ...accum,
            [file]: Boolean(shouldBeInLocal),
        }), {})
);

export const getCanGoForwardFromSelectStorageLocationPage = createSelector([
    getUploadFiles,
    getFileToArchive,
    getFileToStoreOnIsilon,
], (files: string[], fileToArchive: FilepathToBoolean, fileToStoreOnIsilon: FilepathToBoolean) =>
    !some(files, (f: string) => !fileToArchive[f] && !fileToStoreOnIsilon[f]));

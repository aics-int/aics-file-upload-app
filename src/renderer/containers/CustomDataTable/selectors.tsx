import { basename } from "path";

import { isEqual } from "lodash";
import {
  createSelector,
  createSelectorCreator,
  defaultMemoize,
} from "reselect";

import { MAIN_FONT_WIDTH, AnnotationName } from "../../constants";
import { ColumnType } from "../../services/labkey-client/types";
import {
  getAnnotationTypes,
  getPlateBarcodeToPlates,
} from "../../state/metadata/selectors";
import {
  getAreSelectedUploadsInFlight,
  getMassEditRow,
} from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { getUpload } from "../../state/upload/selectors";
import { getTextWidth } from "../../util";
import FilenameCell from "../Table/CustomCells/FilenameCell";
import ImagingSessionCell from "../Table/CustomCells/ImagingSessionCell";
import NotesCell from "../Table/CustomCells/NotesCell";
import PlateBarcodeCell from "../Table/CustomCells/PlateBarcodeCell";
import SelectionCell from "../Table/CustomCells/SelectionCell";
import WellCell from "../Table/CustomCells/WellCell";
import ReadOnlyCell from "../Table/DefaultCells/ReadOnlyCell";
import SelectionHeader from "../Table/Headers/SelectionHeader";

import { CustomColumn } from "./types";

// The default "createSelector" from reselect is too shallow for getHiddenColumns
const createDeepEqualSelector = createSelectorCreator(defaultMemoize, isEqual);

const MAX_HEADER_WIDTH = 200;

// Determine best width for column based on its type and header name
// tries to account for the header text width up to an upper limit
// to prevent extreme widths
function getColumnWidthForType(column: string, type?: ColumnType): number {
  // Find the max width between the words in the column header
  // so we can prevent words from breaking into pieces
  const maxWidth = column
    .split(" ")
    .reduce(
      (widthSoFar, word) =>
        Math.max(widthSoFar, getTextWidth("14px Nunito", word)),
      0
    );

  // Multiply by font width
  const maxFontWidth = maxWidth + 3 * MAIN_FONT_WIDTH;

  // Ensure minimum for type is met without creating too large
  // of headers
  switch (type) {
    case ColumnType.BOOLEAN:
      return Math.min(Math.max(75, maxFontWidth), MAX_HEADER_WIDTH);
    case ColumnType.DURATION:
      return 200;
    case ColumnType.NUMBER:
    case ColumnType.TEXT:
      return Math.min(Math.max(100, maxFontWidth), MAX_HEADER_WIDTH);
    default:
      return Math.min(Math.max(150, maxFontWidth), MAX_HEADER_WIDTH);
  }
}

const SELECTION_COLUMN: CustomColumn = {
  id: "selection",
  disableResizing: true,
  Header: SelectionHeader,
  Cell: SelectionCell,
  maxWidth: 35,
};

export const DEFAULT_COLUMNS: CustomColumn[] = [
  {
    accessor: "file",
    id: "File",
    Cell: FilenameCell,
    description: "Filename of file supplied",
    width: 200,
    sortType: (a, b) =>
      basename(a.original.file).localeCompare(basename(b.original.file)),
  },
  {
    accessor: AnnotationName.NOTES,
    Cell: NotesCell,
    description: "Any additional text data (not ideal for querying)",
    maxWidth: 50,
  },
  {
    accessor: AnnotationName.PLATE_BARCODE,
    Cell: PlateBarcodeCell,
    // This description was pulled from LK 07/16/21
    description: "The barcode for a Plate in LabKey	",
    width: getColumnWidthForType(
      AnnotationName.PLATE_BARCODE,
      ColumnType.LOOKUP
    ),
  },
  {
    accessor: AnnotationName.IMAGING_SESSION,
    Cell: ImagingSessionCell,
    // This description was pulled from LK 07/16/21
    description:
      "Describes the session in which a plate is imaged. This is used especially when a single plate is imaged multiple times to identify each session (e.g. 2 hour - Drugs, 4 hour - Drugs)	",
    width: getColumnWidthForType(
      AnnotationName.IMAGING_SESSION,
      ColumnType.LOOKUP
    ),
  },
  {
    accessor: AnnotationName.WELL,
    Cell: WellCell,
    // This description was pulled from LK 03/22/21
    description: "A well on a plate (that has been entered into the Plate UI)",
    width: 100,
  },
];

export const getHiddenColumns = createSelector(
  [getUpload, getMassEditRow, getPlateBarcodeToPlates],
  (upload, massEditRow, plateBarcodeToPlates): string[] => {
    const selectedPlateBarcodes: string[] = massEditRow
      ? massEditRow[AnnotationName.PLATE_BARCODE] || []
      : Object.values(upload).flatMap(
          (u) => u[AnnotationName.PLATE_BARCODE] || []
        );

    // If no plates have been selected ignored imaging session and well
    if (!selectedPlateBarcodes.length) {
      return [AnnotationName.IMAGING_SESSION, AnnotationName.WELL];
    }

    // If no plates selected have imaging sessions ignore imaging session
    const platesHaveImagingSessions = selectedPlateBarcodes.some((pb) =>
      plateBarcodeToPlates[pb]?.some((i) => i?.name)
    );
    if (!platesHaveImagingSessions) {
      return [AnnotationName.IMAGING_SESSION];
    }

    return [];
  }
);

// Uses createDeepEqualSelector() instead of default selector
// because getHiddenColumns() re-computes on every upload state change
// which is not helpful or necessary for computing the columns
// and can cause the user adjusted column widths to get reset
export const getDefaultColumnsForTable = createDeepEqualSelector(
  [getHiddenColumns],
  (hiddenColumns): CustomColumn[] =>
    DEFAULT_COLUMNS.filter((c) => !hiddenColumns.includes(c.accessor as string))
);

export const getTemplateColumnsForTable = createSelector(
  [getAnnotationTypes, getAppliedTemplate],
  (annotationTypes, template): CustomColumn[] => {
    if (!template) {
      return [];
    }

    return template.annotations
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((annotation) => {
        const type = annotationTypes.find(
          (type) => type.annotationTypeId === annotation.annotationTypeId
        )?.name;
        return {
          type,
          accessor: annotation.name,
          description: annotation.description,
          dropdownValues: annotation.annotationOptions,
          isRequired: annotation.required,
          width: getColumnWidthForType(annotation.name, type),
        };
      });
  }
);

export const getColumnsForTable = createSelector(
  [
    getDefaultColumnsForTable,
    getTemplateColumnsForTable,
    getAreSelectedUploadsInFlight,
  ],
  (defaultColumns, templateColumns, isReadOnly): CustomColumn[] => {
    if (isReadOnly) {
      const columns = templateColumns.map((column) => ({
        ...column,
        Cell: ReadOnlyCell,
      }));
      return [...defaultColumns, ...columns].map((column) => ({
        ...column,
        isReadOnly: true,
      }));
    }
    return [SELECTION_COLUMN, ...defaultColumns, ...templateColumns];
  }
);

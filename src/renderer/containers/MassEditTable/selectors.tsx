import { createSelector } from "reselect";

import { AnnotationName } from "../../constants";
import { getPlateBarcodeToPlates } from "../../state/metadata/selectors";
import { getMassEditRow } from "../../state/selection/selectors";
import {
  getTemplateColumnsForTable,
  IMAGING_SESSION_COLUMN,
  PLATE_BARCODE_COLUMN,
  WELL_COLUMN,
} from "../CustomDataTable/selectors";
import { CustomColumn } from "../CustomDataTable/types";

export const getSelectedPlateBarcodes = createSelector(
  [getMassEditRow],
  (massEditRow): string[] => massEditRow?.[AnnotationName.PLATE_BARCODE] || []
);

export const getCanShowWellColumn = createSelector(
  [getSelectedPlateBarcodes],
  (selectedPlateBarcodes): boolean => !!selectedPlateBarcodes.length
);

// If no selected plates have imaging sessions ignore imaging session
export const getCanShowImagingSessionColumn = createSelector(
  [getSelectedPlateBarcodes, getPlateBarcodeToPlates],
  (selectedPlateBarcodes, plateBarcodeToPlates): boolean =>
    selectedPlateBarcodes.some((pb) =>
      plateBarcodeToPlates[pb]?.some((i) => i?.name)
    )
);

export const getColumnsForMassEditTable = createSelector(
  [
    getTemplateColumnsForTable,
    getCanShowWellColumn,
    getCanShowImagingSessionColumn,
  ],
  (
    columnsFromTemplate,
    canShowWellColumn,
    canShowImagingSessionColumn
  ): CustomColumn[] => {
    const columns: CustomColumn[] = [PLATE_BARCODE_COLUMN];

    if (canShowImagingSessionColumn) {
      columns.push(IMAGING_SESSION_COLUMN);
    }
    if (canShowWellColumn) {
      columns.push(WELL_COLUMN);
    }

    return [...columns, ...columnsFromTemplate];
  }
);

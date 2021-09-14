import { createSelector } from "reselect";

import { AnnotationName } from "../../constants";
import { getPlateBarcodeToPlates } from "../../state/metadata/selectors";
import { getMassEditRow } from "../../state/selection/selectors";

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

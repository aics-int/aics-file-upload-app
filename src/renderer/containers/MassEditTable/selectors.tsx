import { createSelector } from "reselect";

import { AnnotationName } from "../../constants";
import { getMassEditRow } from "../../state/selection/selectors";

export const getSelectedPlateBarcodes = createSelector(
  [getMassEditRow],
  (massEditRow): string[] => massEditRow?.[AnnotationName.PLATE_BARCODE] || []
);

export const getCanShowWellColumn = createSelector(
  [getSelectedPlateBarcodes],
  (selectedPlateBarcodes): boolean => !!selectedPlateBarcodes.length
);

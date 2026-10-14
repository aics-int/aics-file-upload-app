import { expect } from "chai";

import { AnnotationName } from "../../../constants";
import { mockState } from "../../../state/test/mocks";
import { getCanShowWellColumn, getSelectedPlateBarcodes } from "../selectors";

describe("MassEditRow selectors", () => {
  describe("getSelectedPlateBarcodes", () => {
    it("returns empty array when no plate barcodes are selected", () => {
      // Act
      const actual = getSelectedPlateBarcodes(mockState);

      // Assert
      expect(actual).to.be.empty;
    });

    it("returns selected plate barcodes", () => {
      // Arrange
      const expected = ["ab12313", "123041234", "2134"];
      const state = {
        ...mockState,
        selection: {
          ...mockState.selection,
          massEditRow: {
            [AnnotationName.PLATE_BARCODE]: expected,
          },
        },
      };

      // Act
      const actual = getSelectedPlateBarcodes(state);

      // Assert
      expect(actual).to.deep.equal(expected);
    });
  });

  describe("getCanShowWellColumn", () => {
    it("returns false when no plates selected", () => {
      // Act
      const actual = getCanShowWellColumn(mockState);

      // Assert
      expect(actual).to.be.false;
    });

    it("returns true when plates are selected", () => {
      // Arrange
      const state = {
        ...mockState,
        selection: {
          ...mockState.selection,
          massEditRow: {
            [AnnotationName.PLATE_BARCODE]: ["12341432"],
          },
        },
      };

      // Act
      const actual = getCanShowWellColumn(state);

      // Assert
      expect(actual).to.be.true;
    });
  });
});

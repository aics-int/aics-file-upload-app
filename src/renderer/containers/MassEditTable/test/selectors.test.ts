import { expect } from "chai";

import { AnnotationName } from "../../../constants";
import { mockState } from "../../../state/test/mocks";
import {
  getCanShowImagingSessionColumn,
  getCanShowWellColumn,
  getSelectedPlateBarcodes,
} from "../selectors";

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

  describe("getCanShowImagingSessionColumn", () => {
    it("returns true when selected plates have imaging session options", () => {
      // Arrange
      const plateBarcode = "1234123";
      const state = {
        ...mockState,
        metadata: {
          ...mockState.metadata,
          plateBarcodeToPlates: {
            [plateBarcode]: [
              {
                name: "imaging session 1",
                imagingSessionId: 4,
                wells: [],
              },
            ],
          },
        },
        selection: {
          ...mockState.selection,
          massEditRow: {
            [AnnotationName.PLATE_BARCODE]: [plateBarcode],
          },
        },
      };

      // Act
      const actual = getCanShowImagingSessionColumn(state);

      // Assert
      expect(actual).to.be.true;
    });

    it("returns false when selected plates do not have imaging session options", () => {
      // Arrange
      const state = {
        ...mockState,
        selection: {
          ...mockState.selection,
          massEditRow: {
            [AnnotationName.PLATE_BARCODE]: ["12341234"],
          },
        },
      };

      // Act
      const actual = getCanShowImagingSessionColumn(state);

      // Assert
      expect(actual).to.be.false;
    });

    it("returns false when no plates are selected", () => {
      // Act
      const actual = getCanShowImagingSessionColumn(mockState);

      // Assert
      expect(actual).to.be.false;
    });
  });
});

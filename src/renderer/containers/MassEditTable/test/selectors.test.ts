import { expect } from "chai";

import { AnnotationName } from "../../../constants";
import {
  mockAuditInfo,
  mockMMSTemplate,
  mockState,
} from "../../../state/test/mocks";
import {
  DEFAULT_COLUMNS,
  IMAGING_SESSION_COLUMN,
  PLATE_BARCODE_COLUMN,
  WELL_COLUMN,
} from "../../CustomDataTable/selectors";
import {
  getCanShowImagingSessionColumn,
  getCanShowWellColumn,
  getSelectedPlateBarcodes,
  getColumnsForMassEditTable,
} from "../selectors";

describe("MassEditRow selectors", () => {
  const annotationNames = ["Cell Line", "Color", "Is Aligned"];
  const annotations = annotationNames.map((name, index) => ({
    ...mockAuditInfo,
    annotationId: index,
    name,
    description: `${name} description`,
    annotationTypeId: index === 0 ? 0 : 1,
    orderIndex: index,
    annotationOptions: [],
    required: false,
  }));
  const appliedTemplate = {
    ...mockMMSTemplate,
    annotations,
  };

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

  describe("getColumnsForMassEditTable", () => {
    it("includes only template columns when no barcode selected", () => {
      // Arrange
      const state = {
        ...mockState,
        template: {
          ...mockState.template,
          appliedTemplate,
        },
      };

      // Act
      const actual = getColumnsForMassEditTable(state);

      // Assert
      DEFAULT_COLUMNS.forEach((column) => {
        expect(actual).to.not.include(column);
      });
      annotationNames.forEach((annotationName) => {
        expect(actual.some((c) => c.accessor === annotationName)).to.be.true;
      });
      expect(actual).to.include(PLATE_BARCODE_COLUMN);
      expect(actual).to.not.include(WELL_COLUMN);
      expect(actual).to.not.include(IMAGING_SESSION_COLUMN);
    });

    it("includes well column when plate barcodes are selected", () => {
      // Arrange
      const state = {
        ...mockState,
        selection: {
          ...mockState.selection,
          massEditRow: {
            [AnnotationName.PLATE_BARCODE]: ["892432"],
          },
        },
        template: {
          ...mockState.template,
          appliedTemplate,
        },
      };

      // Act
      const actual = getColumnsForMassEditTable(state);

      // Assert
      DEFAULT_COLUMNS.forEach((column) => {
        expect(actual).to.not.include(column);
      });
      annotationNames.forEach((annotationName) => {
        expect(actual.some((c) => c.accessor === annotationName)).to.be.true;
      });
      expect(actual).to.include(PLATE_BARCODE_COLUMN);
      expect(actual).to.include(WELL_COLUMN);
      expect(actual).to.not.include(IMAGING_SESSION_COLUMN);
    });

    it("includes imaging session column when selected barcodes have imaging session options", () => {
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
        template: {
          ...mockState.template,
          appliedTemplate,
        },
      };

      // Act
      const actual = getColumnsForMassEditTable(state);

      // Assert
      DEFAULT_COLUMNS.forEach((column) => {
        expect(actual).to.not.include(column);
      });
      annotationNames.forEach((annotationName) => {
        expect(actual.some((c) => c.accessor === annotationName)).to.be.true;
      });
      expect(actual).to.include(PLATE_BARCODE_COLUMN);
      expect(actual).to.include(WELL_COLUMN);
      expect(actual).to.include(IMAGING_SESSION_COLUMN);
    });
  });
});

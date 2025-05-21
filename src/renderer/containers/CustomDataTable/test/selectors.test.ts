import { expect } from "chai";

import { AnnotationName } from "../../../constants";
import { ColumnType } from "../../../services/labkey-client/types";
import {
  getMockStateWithHistory,
  mockAuditInfo,
  mockJob,
  mockMMSTemplate,
  mockSelection,
  mockState,
  mockTemplateStateBranch,
} from "../../../state/test/mocks";
import {
  getCanShowImagingSessionColumn,
  getCanShowWellColumn,
  getColumnsForTable,
  getColumnWidthForType,
  getSelectedPlateBarcodes,
  getTemplateColumnsForTable,
  PLATE_RELATED_COLUMNS,
} from "../selectors";

describe("CustomDataTable selectors", () => {
  const annotationTypes = [
    ColumnType.LOOKUP,
    ColumnType.TEXT,
    ColumnType.BOOLEAN,
  ].map((name, index) => ({
    name,
    annotationTypeId: index,
  }));
  const annotations = ["Cell Line", "Color", "Is Aligned"].map(
    (name, index) => {
      const lookupTypeExtras =
        index === 0
          ? {
              lookupSchema: "Celllines",
              lookupTable: "Cell Line",
            }
          : null;
      return {
        ...mockAuditInfo,
        annotationId: index,
        name,
        description: `${name} description`,
        annotationTypeId: annotationTypes[index]["annotationTypeId"],
        orderIndex: index,
        annotationOptions: [],
        required: false,
        ...lookupTypeExtras,
      };
    }
  );
  const appliedTemplate = {
    ...mockMMSTemplate,
    annotations,
  };

  describe("getSelectedPlateBarcodes", () => {
    it("returns empty array when no plate barcodes have been selected", () => {
      // Act
      const actual = getSelectedPlateBarcodes(mockState);

      // Assert
      expect(actual).to.be.empty;
    });

    it("returns plate barcodes from upload when present", () => {
      // Arrange
      const expected = ["12341234", "91234124", "981234214"];
      const state = {
        ...mockState,
        upload: getMockStateWithHistory({
          abc123: {
            file: "abc123",
            [AnnotationName.PLATE_BARCODE]: expected.slice(0, 2),
          },
          def456: {
            file: "def456",
            [AnnotationName.PLATE_BARCODE]: expected.slice(2),
          },
        }),
      };

      // Act
      const actual = getSelectedPlateBarcodes(state);

      // Assert
      expect(actual).to.deep.equal(expected);
    });
  });

  describe("getCanShowWellColumn", () => {
    it("returns true when plates have been selected", () => {
      // Arrange
      const plateBarcode = "12341234";
      const state = {
        ...mockState,
        upload: getMockStateWithHistory({
          abc123: {
            file: "abc123",
            [AnnotationName.PLATE_BARCODE]: [plateBarcode],
          },
        }),
      };

      // Act
      const actual = getCanShowWellColumn(state);

      // Assert
      expect(actual).to.be.true;
    });

    it("returns false when no plates have been selected", () => {
      // Act
      const actual = getCanShowWellColumn(mockState);

      // Assert
      expect(actual).to.be.false;
    });
  });

  describe("getCanShowImagingSessionColumn", () => {
    it("returns true when plates with imaging sessions have been selected", () => {
      // Arrange
      const plateBarcode = "230141";
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
        upload: getMockStateWithHistory({
          abc123: {
            file: "abc123",
            [AnnotationName.PLATE_BARCODE]: [plateBarcode],
          },
        }),
      };

      // Act
      const actual = getCanShowImagingSessionColumn(state);

      // Assert
      expect(actual).to.be.true;
    });

    it("returns false when no plates with imaging sessions have been selected", () => {
      // Arrange
      const state = {
        ...mockState,
        upload: getMockStateWithHistory({
          abc123: {
            file: "abc123",
            [AnnotationName.PLATE_BARCODE]: ["230141"],
          },
        }),
      };

      // Act
      const actual = getCanShowImagingSessionColumn(state);

      // Assert
      expect(actual).to.be.false;
    });

    it("returns false when no plates have been selected", () => {
      // Arrange
      const state = {
        ...mockState,
        upload: getMockStateWithHistory({
          abc123: {
            file: "abc123",
          },
        }),
      };

      // Act
      const actual = getCanShowImagingSessionColumn(state);

      // Assert
      expect(actual).to.be.false;
    });
  });

  describe("getTemplateColumnsForTable", () => {
    it("returns plate and expected columns from template", () => {
      // Act
      const actual = getTemplateColumnsForTable({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes,
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate,
        },
      });

      // Assert
      expect(actual).to.be.lengthOf(7);
      expect(actual).deep.equal([
        ...PLATE_RELATED_COLUMNS,
        ...annotations.map((a, index) => {
          const type = annotationTypes[index].name;
          const lookupTypeExtras =
            annotationTypes[index].name === ColumnType.LOOKUP
              ? {
                  lookupSchema: "Celllines",
                  lookupTable: "Cell Line",
                }
              : null;
          return {
            type,
            accessor: a.name,
            description: a.description,
            dropdownValues: [],
            isRequired: false,
            width: getColumnWidthForType(a.name, type),
            ...lookupTypeExtras,
          };
        }),
      ]);
    });

    it("sorts annotations according to orderIndex", () => {
      // Arrange
      const state = {
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes,
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate,
        },
      };

      // Act
      const actual = getTemplateColumnsForTable(state);

      // Assert
      expect(actual).to.be.lengthOf(7);
      actual.slice(4).forEach((column, index) => { // 4 default "plate related" columns
        const match = annotations.find((a) => a.orderIndex === index);
        expect(column.accessor).to.deep.equal(match?.name);
      });
    });
  });

  describe("getColumnsForTable", () => {
    it("includes default and plate related", () => {
      // Act
      const actual = getColumnsForTable({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes,
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate,
        },
      });

      // Assert
      expect(actual.length).to.equal(10);
      expect(actual.filter((c) => !c.isReadOnly)).to.be.lengthOf(10);
      expect(actual.some((c) => c.id === "selection")).to.be.true;
      expect(actual.some((c) => c.accessor === "file")).to.be.true;
      expect(actual.some((c) => c.accessor === AnnotationName.NOTES)).to.be
        .true;
      expect(actual.some((c) => c.accessor === AnnotationName.PLATE_BARCODE)).to
        .be.true;
      expect(actual.some((c) => c.accessor === AnnotationName.WELL)).to.be.true;
      expect(actual.some((c) => c.accessor === AnnotationName.IMAGING_SESSION))
        .to.be.true;
      expect(actual.some((c) => c.accessor === AnnotationName.PROGRAM)).to.be.true;
    });

    it("sets columns to read only", () => {
      // Act
      const actual = getColumnsForTable({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes,
        },
        selection: {
          ...mockSelection,
          uploads: [mockJob],
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate,
        },
      });

      // Assert
      expect(actual.length).to.equal(9);
      // Assert: ensure the only non-readonly columns are the defaults
      expect(actual.every((c) => c.isReadOnly)).to.be.true;
      expect(actual.some((c) => c.id === "selection")).to.be.false;
      expect(actual.some((c) => c.accessor === "file")).to.be.true;
      expect(actual.some((c) => c.accessor === AnnotationName.NOTES)).to.be
        .true;
      expect(actual.some((c) => c.accessor === AnnotationName.PLATE_BARCODE)).to
        .be.true;
      expect(actual.some((c) => c.accessor === AnnotationName.WELL)).to.be.true;
      expect(actual.some((c) => c.accessor === AnnotationName.IMAGING_SESSION))
        .to.be.true;
      expect(actual.some((c) => c.accessor === AnnotationName.PROGRAM)).to.be.true;
    });
  });
});

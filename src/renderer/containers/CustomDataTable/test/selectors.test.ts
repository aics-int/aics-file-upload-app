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
  getColumnsForTable,
  getSelectedPlateBarcodes,
  getCanShowImagingSessionColumn,
  getCanShowWellColumn,
  getTemplateColumnsForTable,
  PLATE_BARCODE_COLUMN,
  WELL_COLUMN,
  IMAGING_SESSION_COLUMN,
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
    (name, index) => ({
      ...mockAuditInfo,
      annotationId: index,
      name,
      description: `${name} description`,
      annotationTypeId: index === 0 ? 0 : 1,
      orderIndex: index,
      annotationOptions: [],
      required: false,
    })
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
      expect(actual).to.be.lengthOf(3);
      expect(actual).deep.equal(
        annotations.map((a, index) => ({
          type: index === 0 ? ColumnType.LOOKUP : ColumnType.TEXT,
          accessor: a.name,
          description: a.description,
          dropdownValues: [],
          isRequired: false,
          width: index === 0 ? 150 : 100,
        }))
      );
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
      expect(actual).to.be.lengthOf(3);
      actual.forEach((column, index) => {
        const match = annotations.find((a) => a.orderIndex === index);
        expect(column.accessor).to.deep.equal(match?.name);
      });
    });
  });

  describe("getColumnsForTable", () => {
    it("includes selection, file, and notes columns", () => {
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
      expect(actual.length).to.equal(7);
      expect(actual.find((c) => c.id === "selection")).to.not.be.undefined;
      expect(actual.filter((c) => !c.isReadOnly)).to.be.lengthOf(7);
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
      expect(actual.length).to.equal(6);
      // Assert: ensure the only non-readonly columns are the defaults
      expect(actual.every((c) => c.isReadOnly)).to.be.true;
      expect(actual.find((c) => c.id === "selection")).to.be.undefined;
    });
  });

  it("includes well when plate barcode is present in upload", () => {
    // Arrange
    const plateBarcode = "12391013";
    const state = {
      ...mockState,
      metadata: {
        ...mockState.metadata,
        plateBarcodeToPlates: {
          [plateBarcode]: [
            {
              wells: [],
            },
          ],
        },
      },
      template: {
        ...mockTemplateStateBranch,
        appliedTemplate,
      },
      upload: getMockStateWithHistory({
        "file-1.txt": {
          file: "file-1.txt",
          [AnnotationName.PLATE_BARCODE]: [plateBarcode],
        },
      }),
    };

    // Act
    const actual = getColumnsForTable(state);

    // Assert
    expect(actual).to.include(PLATE_BARCODE_COLUMN);
    expect(actual).to.include(WELL_COLUMN);
    expect(actual).to.not.include(IMAGING_SESSION_COLUMN);
  });

  it("returns imaging session when plate barcode has imaging sessions", () => {
    // Arrange
    const plateBarcode = "1234145";
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
      template: {
        ...mockTemplateStateBranch,
        appliedTemplate,
      },
      upload: getMockStateWithHistory({
        "file-1.txt": {
          file: "file-1.txt",
          [AnnotationName.PLATE_BARCODE]: [plateBarcode],
        },
      }),
    };

    // Act
    const actual = getColumnsForTable(state);

    // Assert
    expect(actual).to.include(PLATE_BARCODE_COLUMN);
    expect(actual).to.include(WELL_COLUMN);
    expect(actual).to.include(IMAGING_SESSION_COLUMN);
  });
});

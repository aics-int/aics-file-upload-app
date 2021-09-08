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
  DEFAULT_COLUMNS,
  getColumnsForTable,
  getDefaultColumnsForTable,
  getHiddenColumns,
  getTemplateColumnsForTable,
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

  describe("getDefaultColumnsForTable", () => {
    it("includes file and notes", () => {
      // Arrange
      const expected = DEFAULT_COLUMNS.filter(
        (a) =>
          ![AnnotationName.IMAGING_SESSION, AnnotationName.WELL].includes(
            a.accessor as AnnotationName
          )
      );

      // Act
      const actual = getDefaultColumnsForTable(mockState);

      // Assert
      expect(actual).deep.equal(expected);
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
        upload: getMockStateWithHistory({
          "file-1.txt": {
            file: "file-1.txt",
            [AnnotationName.PLATE_BARCODE]: [plateBarcode],
          },
        }),
      };
      const expected = DEFAULT_COLUMNS.filter(
        (a) => a.accessor !== AnnotationName.IMAGING_SESSION
      );

      // Act
      const actual = getDefaultColumnsForTable(state);

      // Assert
      expect(actual).deep.equal(expected);
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
      const actual = getDefaultColumnsForTable(state);

      // Assert
      expect(actual).deep.equal(DEFAULT_COLUMNS);
    });

    it("includes well and imaging session when mass edit row has plate barcode", () => {
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
        selection: {
          ...mockState.selection,
          massEditRow: {
            [AnnotationName.PLATE_BARCODE]: [plateBarcode],
          },
        },
        upload: getMockStateWithHistory({
          "file-1.txt": {
            file: "file-1.txt",
          },
        }),
      };

      // Act
      const actual = getDefaultColumnsForTable(state);

      // Assert
      expect(actual).deep.equal(DEFAULT_COLUMNS);
    });
  });

  describe("getHiddenColumns", () => {
    it("returns empty array when plate with imaging session selected", () => {
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
      const actual = getHiddenColumns(state);

      // Assert
      expect(actual).to.be.empty;
    });

    it("returns imaging session when plates without imaging session are selected", () => {
      // Arrange
      const plateBarcode = "230141";
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
        upload: getMockStateWithHistory({
          abc123: {
            file: "abc123",
            [AnnotationName.PLATE_BARCODE]: [plateBarcode],
          },
        }),
      };

      // Act
      const actual = getHiddenColumns(state);

      // Assert
      expect(actual).to.deep.equal([AnnotationName.IMAGING_SESSION]);
    });

    it("returns imaging session and well when no plates are selected", () => {
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
      const actual = getHiddenColumns(state);

      // Assert
      expect(actual).to.deep.equal([
        AnnotationName.IMAGING_SESSION,
        AnnotationName.WELL,
      ]);
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
});

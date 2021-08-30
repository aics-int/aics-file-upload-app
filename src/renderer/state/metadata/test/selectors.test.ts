import { expect } from "chai";

import { ColumnType } from "../../../services/labkey-client/types";
import {
  mockAuditInfo,
  mockState,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import {
  getAnnotations,
  getAnnotationsWithAnnotationOptions,
  getBooleanAnnotationTypeId,
  getLookupAnnotationTypeId,
  getTemplateIdToName,
  getUniqueBarcodeSearchResults,
  getUserIdToDisplayName,
} from "../selectors";

describe("Metadata selectors", () => {
  describe("getUniqueBarcodeSearchResults", () => {
    it("groups by barcode and combines imagingSessionIds", () => {
      const barcode1 = "barcode1";
      const barcode2 = "barcode2";
      const barcodeSearchResults = [
        {
          barcode: barcode1,
          imagingSessionId: 1,
        },
        {
          barcode: barcode2,
          imagingSessionId: null,
        },
        {
          barcode: barcode1,
          imagingSessionId: 2,
        },
      ];
      const results = getUniqueBarcodeSearchResults({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          barcodeSearchResults,
        },
      });

      expect(results.length).to.equal(2);
      expect(results).to.deep.include({
        barcode: barcode1,
        imagingSessionIds: [1, 2],
      });
      expect(results).to.deep.include({
        barcode: barcode2,
        imagingSessionIds: [null],
      });
    });
  });

  describe("getTemplateIdToName", () => {
    it("indexes templates by their ids", () => {
      // Arrange
      const state = {
        ...mockState,
        metadata: {
          ...mockState.metadata,
          templates: [
            { Name: "First", TemplateId: 1, Version: 1 },
            { Name: "First", TemplateId: 2, Version: 2 },
            { Name: "Another One", TemplateId: 7, Version: 4 },
          ],
        },
      };
      const expected = {
        1: "First (V1)",
        2: "First (V2)",
        7: "Another One (V4)",
      };

      // Act
      const actual = getTemplateIdToName(state);

      // Assert
      expect(actual).to.be.deep.equal(expected);
    });

    it("produces empty object when no templates found", () => {
      // Arrange
      const state = { ...mockState };

      // Act
      const actual = getTemplateIdToName(state);

      // Assert
      expect(actual).to.be.empty;
    });
  });

  describe("getBooleanAnnotationTypeId", () => {
    it("returns id for annotation type with name matching BOOLEAN if found", () => {
      const result = getBooleanAnnotationTypeId({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes: [
            { annotationTypeId: 1, name: ColumnType.TEXT },
            { annotationTypeId: 2, name: ColumnType.BOOLEAN },
          ],
        },
      });
      expect(result).to.equal(2);
    });
    it("returns undefined if no annotation type has name matching BOOLEAN", () => {
      const result = getBooleanAnnotationTypeId({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes: [
            { annotationTypeId: 1, name: ColumnType.TEXT },
            { annotationTypeId: 2, name: ColumnType.LOOKUP },
          ],
        },
      });
      expect(result).to.equal(undefined);
    });
  });

  describe("getAnnotations", () => {
    it("returns only annotations that are meant to be exposed in this app", () => {
      const result = getAnnotations(nonEmptyStateForInitiatingUpload);
      expect(result).to.be.length(4);
    });
    it("returns empty array if no annotations found", () => {
      const result = getAnnotations({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotations: [],
        },
      });
      expect(result).to.be.empty;
    });
  });

  describe("getLookupAnnotationTypeId", () => {
    it("returns id for annotation type with name matching LOOKUP if found", () => {
      const result = getLookupAnnotationTypeId({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes: [
            { annotationTypeId: 1, name: ColumnType.TEXT },
            { annotationTypeId: 2, name: ColumnType.LOOKUP },
          ],
        },
      });
      expect(result).to.equal(2);
    });
    it("returns undefined if no annotation type has name matching LOOKUP", () => {
      const result = getLookupAnnotationTypeId({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes: [
            { annotationTypeId: 1, name: ColumnType.TEXT },
            { annotationTypeId: 2, name: ColumnType.BOOLEAN },
          ],
        },
      });
      expect(result).to.equal(undefined);
    });
  });
  describe("getAnnotationsWithAnnotationOptions", () => {
    const mockAnnotation = {
      ...mockAuditInfo,
      annotationId: 2,
      annotationTypeId: 3,
      description: "",
      exposeToFileUploadApp: true,
      name: "B",
      "annotationTypeId/Name": ColumnType.TEXT,
    };
    const mockAnnotation2 = {
      ...mockAnnotation,
      annotationId: 3,
      name: "AA",
    };
    const mockAnnotation3 = {
      ...mockAnnotation,
      annotationId: 4,
      name: "AB",
    };
    it("adds annotation options to matching annotation if found and alphabetizes annotations by name", () => {
      const result = getAnnotationsWithAnnotationOptions({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationOptions: [
            {
              annotationId: mockAnnotation.annotationId,
              annotationOptionId: 1,
              value: "a",
            },
            {
              annotationId: mockAnnotation.annotationId,
              annotationOptionId: 1,
              value: "b",
            },
          ],
          annotations: [mockAnnotation, mockAnnotation2, mockAnnotation3],
        },
      });
      expect(result).to.deep.equal([
        {
          ...mockAnnotation2,
          annotationOptions: undefined,
        },
        {
          ...mockAnnotation3,
          annotationOptions: undefined,
        },
        {
          ...mockAnnotation,
          annotationOptions: ["a", "b"],
        },
      ]);
    });
  });

  describe("getUserIdToDisplayName", () => {
    it("maps user ids to display names", () => {
      // Arrange
      const state = {
        ...mockState,
        metadata: {
          ...mockState.metadata,
          users: ["Foo", "Bar", "Baz"].map((displayName, index) => ({
            displayName,
            userId: index,
          })),
        },
      };
      const expected = {
        0: "Foo",
        1: "Bar",
        2: "Baz",
      };

      // Act
      const actual = getUserIdToDisplayName(state);

      // Assert
      expect(actual).to.deep.equal(expected);
    });

    it("produces empty map when users is undefined", () => {
      // Act
      const actual = getUserIdToDisplayName(mockState);

      // Assert
      expect(actual).to.deep.equal({});
    });
  });
});

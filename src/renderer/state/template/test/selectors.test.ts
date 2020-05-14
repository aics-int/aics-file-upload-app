import { expect } from "chai";

import {
  getMockStateWithHistory,
  mockAnnotationDraft,
  mockFavoriteColorAnnotation,
  mockNotesAnnotation,
  mockState,
  mockTemplateDraft,
  mockTemplateStateBranch,
  mockWellAnnotation,
  mockWorkflowAnnotation,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";

import {
  getCompleteAppliedTemplate,
  getTemplateDraftErrors,
} from "../selectors";
import { ColumnType } from "../types";

describe("Template selectors", () => {
  describe("getTemplateDraftErrors", () => {
    it("returns empty error array if no errors", () => {
      const result = getTemplateDraftErrors({
        ...mockState,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          draft: {
            ...mockTemplateDraft,
          },
        }),
      });
      expect(result.length).to.equal(0);
    });
    it("adds error if draft is missing a name", () => {
      const result = getTemplateDraftErrors({
        ...mockState,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          draft: {
            ...mockTemplateDraft,
            name: undefined,
          },
        }),
      });
      expect(result).to.contain("Template is missing a name");
    });
    it("adds error if an annotation is missing a name", () => {
      const result = getTemplateDraftErrors({
        ...mockState,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          draft: {
            ...mockTemplateDraft,
            annotations: [
              {
                ...mockAnnotationDraft,
                name: undefined,
              },
            ],
          },
        }),
      });
      expect(result).to.contain("At least one annotation is missing a name");
    });
    it("adds error if annotation is a dropdown but does not have options", () => {
      const result = getTemplateDraftErrors({
        ...mockState,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          draft: {
            ...mockTemplateDraft,
            annotations: [
              {
                ...mockAnnotationDraft,
                annotationTypeId: 5,
                annotationTypeName: ColumnType.DROPDOWN,
              },
            ],
          },
        }),
      });
      expect(result).to.contain(
        "Annotation Color is a dropdown but is missing dropdown options"
      );
    });
    it("adds error if annotation is a dropdown but has only one option", () => {
      const result = getTemplateDraftErrors({
        ...mockState,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          draft: {
            ...mockTemplateDraft,
            annotations: [
              {
                ...mockAnnotationDraft,
                annotationOptions: ["red"],
                annotationTypeId: 5,
                annotationTypeName: ColumnType.DROPDOWN,
              },
            ],
          },
        }),
      });
      expect(result).to.contain("Dropdowns require at least two options.");
    });
    it("adds error if annotation is a lookup but does not have a lookup table", () => {
      const result = getTemplateDraftErrors({
        ...mockState,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          draft: {
            ...mockTemplateDraft,
            annotations: [
              {
                ...mockAnnotationDraft,
                annotationTypeId: 6,
                annotationTypeName: ColumnType.LOOKUP,
              },
            ],
          },
        }),
      });
      expect(result).to.contain(
        "Annotation Color is a lookup but no lookup table is specified"
      );
    });
    it("adds error if there are no annotations", () => {
      const result = getTemplateDraftErrors({
        ...mockState,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          draft: {
            ...mockTemplateDraft,
            annotations: [],
          },
        }),
      });
      expect(result).to.contain("Templates need at least one annotation");
    });
    it("adds error if duplicate names found", () => {
      const result = getTemplateDraftErrors({
        ...mockState,
        template: getMockStateWithHistory({
          ...mockTemplateStateBranch,
          draft: {
            ...mockTemplateDraft,
            annotations: [mockAnnotationDraft, mockAnnotationDraft],
          },
        }),
      });
      expect(result).to.contain("Found duplicate annotation names");
    });
  });

  describe("getCompleteAppliedTemplate", () => {
    it("adds annotations for notes, wells, and workflows", () => {
      const result = getCompleteAppliedTemplate(
        nonEmptyStateForInitiatingUpload
      );
      expect(result).to.not.be.undefined;
      if (result) {
        const annotationIds = result.annotations.map((a) => a.annotationId);
        expect(annotationIds).to.contain(mockNotesAnnotation.annotationId);
        expect(annotationIds).to.contain(mockWellAnnotation.annotationId);
        expect(annotationIds).to.contain(mockWorkflowAnnotation.annotationId);
      }
    });
    it("returns undefined if template has not been applied", () => {
      const result = getCompleteAppliedTemplate(mockState);
      expect(result).to.be.undefined;
    });
    it("throws error if notes annotation not found", () => {
      expect(() =>
        getCompleteAppliedTemplate({
          ...nonEmptyStateForInitiatingUpload,
          metadata: {
            ...nonEmptyStateForInitiatingUpload.metadata,
            annotations: [
              mockWellAnnotation,
              mockWorkflowAnnotation,
              mockFavoriteColorAnnotation,
            ],
          },
        })
      ).to.throw();
    });
    it("throws error if well annotation not found", () => {
      expect(() =>
        getCompleteAppliedTemplate({
          ...nonEmptyStateForInitiatingUpload,
          metadata: {
            ...nonEmptyStateForInitiatingUpload.metadata,
            annotations: [
              mockNotesAnnotation,
              mockWorkflowAnnotation,
              mockFavoriteColorAnnotation,
            ],
          },
        })
      ).to.throw();
    });
    it("throws error if workflow annotation not found", () => {
      expect(() =>
        getCompleteAppliedTemplate({
          ...nonEmptyStateForInitiatingUpload,
          metadata: {
            ...nonEmptyStateForInitiatingUpload.metadata,
            annotations: [
              mockWellAnnotation,
              mockNotesAnnotation,
              mockFavoriteColorAnnotation,
            ],
          },
        })
      ).to.throw();
    });
    it("adds annotation type names to all annotations", () => {
      const result = getCompleteAppliedTemplate(
        nonEmptyStateForInitiatingUpload
      );
      expect(result).to.not.be.undefined;
      if (result) {
        const types = result.annotations.map((a) => a.type).filter((t) => !!t);
        expect(types.length).to.equal(result.annotations.length);
      }
    });
  });
});

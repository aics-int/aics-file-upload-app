import { expect } from "chai";
import { orderBy } from "lodash";

import { AnnotationName } from "../../../constants";
import { TemplateAnnotation } from "../../../services/metadata-management-service/types";
import { UploadRequest } from "../../../services/types";
import { Duration } from "../../../types";
import {
  getMockStateWithHistory,
  mockAnnotationTypes,
  mockAuditInfo,
  mockBooleanAnnotation,
  mockDateAnnotation,
  mockDateTimeAnnotation,
  mockDropdownAnnotation,
  mockFavoriteColorAnnotation,
  mockFavoriteColorTemplateAnnotation,
  mockIntervalTemplate,
  mockLookupAnnotation,
  mockMMSTemplate,
  mockNotesAnnotation,
  mockNumberAnnotation,
  mockSelection,
  mockState,
  mockTemplateStateBranch,
  mockTemplateStateBranchWithAppliedTemplate,
  mockTemplateWithManyValues,
  mockTextAnnotation,
  mockWellAnnotation,
  mockWellUpload,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { FileModel, State } from "../../types";
import {
  getCanUndoUpload,
  getFileToAnnotationHasValueMap,
  getUploadFileNames,
  getUploadKeyToAnnotationErrorMap,
  getUploadRequests,
} from "../selectors";
import { getUploadAsTableRows, getUploadValidationErrors } from "../selectors";
import { FileType } from "../types";

// utility function to allow us to deeply compare expected and actual output without worrying about order
const standardizeUploads = (uploadRequests: UploadRequest[]): UploadRequest[] =>
    uploadRequests.map((request) => ({
      ...request,
      customMetadata: {
        ...request.customMetadata,
        annotations: orderBy(request.customMetadata?.annotations || [], [
          "annotationId",
        ]),
      },
    }));

describe("Upload selectors", () => {
  describe("getCanUndoUpload", () => {
    it("should return true if the past is not empty", () => {
      expect(
          getCanUndoUpload({
            ...mockState,
            upload: {
              ...mockState.upload,
              index: 1,
            },
          })
      ).to.be.true;
    });

    it("should return false if the past is empty", () => {
      expect(getCanUndoUpload(mockState)).to.be.false;
    });
  });

  describe("getUploadRequests", () => {
    it("Does not include annotations that are not on the template", () => {
      const file = "/path/to/image.tiff";
      const payload = getUploadRequests({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockState.template,
          appliedTemplate: {
            ...mockAuditInfo,
            annotations: [mockFavoriteColorTemplateAnnotation],
            name: "foo",
            templateId: 1,
            version: 1,
          },
        },
        upload: getMockStateWithHistory({
          [file]: {
            barcode: "452",
            favoriteColor: ["Blue"],
            file,
            [AnnotationName.NOTES]: [],
            plateId: 4,
            unexpectedAnnotation: ["Hello World"],
            [AnnotationName.WELL]: [],
          },
        }),
      });
      const unexpectedAnnotation = payload[0]?.customMetadata?.annotations.find(
          (a: { values: string[] }) => a.values.includes("Hello World")
      );
      expect(unexpectedAnnotation).to.be.undefined;
    });
    it("Interprets no values for a boolean annotation as false", () => {
      const state: State = {
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...nonEmptyStateForInitiatingUpload.template,
          appliedTemplate: {
            ...mockMMSTemplate,
            annotations: [mockBooleanAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          "/path/to.dot/image.tiff": {
            Qc: [],
            barcode: "452",
            file: "/path/to.dot/image.tiff",
            [AnnotationName.NOTES]: [],
            plateId: 4,
            [AnnotationName.WELL]: [],
          },
        }),
      };
      const expectedPayload = [
        {
          customMetadata: {
            annotations: [
              {
                annotationId: mockBooleanAnnotation.annotationId,
                values: ["false"],
              },
            ],
            templateId: mockMMSTemplate.templateId,
          },
          file: {
            disposition: "tape",
            fileType: FileType.IMAGE,
            originalPath: "/path/to.dot/image.tiff",
            shouldBeInArchive: true,
            shouldBeInLocal: true,
          },
          microscopy: {},
        },
      ];
      const actual = getUploadRequests(state);
      expect(actual).to.deep.equal(expectedPayload);
    });
    it("Converts upload state branch into correct payload for FSS", () => {
      const state: State = {
        ...nonEmptyStateForInitiatingUpload,
        upload: getMockStateWithHistory({
          "/path/to.dot/image.tiff": {
            barcode: "452",
            file: "/path/to.dot/image.tiff",
            ["Favorite Color"]: ["yellow"],
            [AnnotationName.NOTES]: ["Seeing some interesting things here!"],
            plateId: 4,
            [AnnotationName.WELL]: [6],
          },
          "/path/to/image.czi": {
            barcode: "567",
            ["Favorite Color"]: ["red"],
            file: "/path/to/image.czi",
            [AnnotationName.NOTES]: [],
            plateId: 4,
            [AnnotationName.WELL]: [1],
          },
          "/path/to/image.ome.tiff": {
            barcode: "123",
            ["Favorite Color"]: ["green"],
            file: "/path/to/image.ome.tiff",
            [AnnotationName.NOTES]: [],
            plateId: 2,
            [AnnotationName.WELL]: [2],
          },
          "/path/to/image.png": {
            barcode: "345",
            ["Favorite Color"]: ["purple"],
            file: "/path/to/image.png",
            [AnnotationName.NOTES]: [],
            plateId: 5,
            [AnnotationName.WELL]: [3],
          },
          "/path/to/image.tiff": {
            barcode: "234",
            ["Favorite Color"]: ["orange"],
            file: "/path/to/image.tiff",
            [AnnotationName.NOTES]: [],
            plateId: 3,
            [AnnotationName.WELL]: [4],
          },
          "/path/to/multi-well.txt": {
            barcode: "456",
            ["Favorite Color"]: ["pink"],
            file: "/path/to/multi-well.txt",
            [AnnotationName.NOTES]: [],
            plateId: 7,
            [AnnotationName.WELL]: [5, 6, 7],
          },
          "/path/to/no-extension": {
            barcode: "888",
            ["Favorite Color"]: ["gold"],
            file: "/path/to/no-extension",
            [AnnotationName.NOTES]: [],
            plateId: 7,
            [AnnotationName.WELL]: [7],
          },
          "/path/to/not-image.csv": {
            barcode: "578",
            ["Favorite Color"]: ["grey"],
            file: "/path/to/not-image.csv",
            [AnnotationName.NOTES]: [],
            plateId: 7,
            [AnnotationName.WELL]: [8],
          },
          "/path/to/not-image.txt": {
            barcode: "456",
            ["Favorite Color"]: ["black"],
            file: "/path/to/not-image.txt",
            [AnnotationName.NOTES]: [],
            plateId: 7,
            [AnnotationName.WELL]: [5],
          },
        }),
      };
      const expected: UploadRequest[] = [
        {
          customMetadata: {
            annotations: [
              {
                annotationId: mockFavoriteColorAnnotation.annotationId,
                values: ["yellow"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                values: ["6"],
              },
              {
                annotationId: mockNotesAnnotation.annotationId,
                values: ["Seeing some interesting things here!"],
              },
            ],
            templateId: mockMMSTemplate.templateId,
          },
          file: {
            disposition: "tape",
            fileType: FileType.IMAGE,
            originalPath: "/path/to.dot/image.tiff",
            shouldBeInArchive: true,
            shouldBeInLocal: true,
          },
          microscopy: {
            wellIds: [6],
          },
        },
        {
          customMetadata: {
            annotations: [
              {
                annotationId: mockFavoriteColorAnnotation.annotationId,
                values: ["red"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                values: ["1"],
              },
            ],
            templateId: mockMMSTemplate.templateId,
          },
          file: {
            disposition: "tape",
            fileType: FileType.IMAGE,
            originalPath: "/path/to/image.czi",
            shouldBeInArchive: true,
            shouldBeInLocal: true,
          },
          microscopy: {
            wellIds: [1],
          },
        },
        {
          customMetadata: {
            annotations: [
              {
                annotationId: mockFavoriteColorAnnotation.annotationId,
                values: ["green"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                values: ["2"],
              },
            ],
            templateId: mockMMSTemplate.templateId,
          },
          file: {
            disposition: "tape",
            fileType: FileType.IMAGE,
            originalPath: "/path/to/image.ome.tiff",
            shouldBeInArchive: true,
            shouldBeInLocal: true,
          },
          microscopy: {
            wellIds: [2],
          },
        },
        {
          customMetadata: {
            annotations: [
              {
                annotationId: mockFavoriteColorAnnotation.annotationId,
                values: ["purple"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                values: ["3"],
              },
            ],
            templateId: mockMMSTemplate.templateId,
          },
          file: {
            disposition: "tape",
            fileType: FileType.IMAGE,
            originalPath: "/path/to/image.png",
            shouldBeInArchive: true,
            shouldBeInLocal: true,
          },
          microscopy: {
            wellIds: [3],
          },
        },
        {
          customMetadata: {
            annotations: [
              {
                annotationId: mockFavoriteColorAnnotation.annotationId,
                values: ["orange"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                values: ["4"],
              },
            ],
            templateId: mockMMSTemplate.templateId,
          },
          file: {
            disposition: "tape",
            fileType: FileType.IMAGE,
            originalPath: "/path/to/image.tiff",
            shouldBeInArchive: true,
            shouldBeInLocal: true,
          },
          microscopy: {
            wellIds: [4],
          },
        },
        {
          customMetadata: {
            annotations: [
              {
                annotationId: mockFavoriteColorAnnotation.annotationId,
                values: ["pink"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                values: ["5", "6", "7"],
              },
            ],
            templateId: mockMMSTemplate.templateId,
          },
          file: {
            disposition: "tape",
            fileType: FileType.TEXT,
            originalPath: "/path/to/multi-well.txt",
            shouldBeInArchive: true,
            shouldBeInLocal: true,
          },
          microscopy: {
            wellIds: [5, 6, 7],
          },
        },
        {
          customMetadata: {
            annotations: [
              {
                annotationId: mockFavoriteColorAnnotation.annotationId,
                values: ["gold"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                values: ["7"],
              },
            ],
            templateId: mockMMSTemplate.templateId,
          },
          file: {
            disposition: "tape",
            fileType: FileType.OTHER,
            originalPath: "/path/to/no-extension",
            shouldBeInArchive: true,
            shouldBeInLocal: true,
          },
          microscopy: {
            wellIds: [7],
          },
        },
        {
          customMetadata: {
            annotations: [
              {
                annotationId: mockFavoriteColorAnnotation.annotationId,
                values: ["grey"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                values: ["8"],
              },
            ],
            templateId: mockMMSTemplate.templateId,
          },
          file: {
            disposition: "tape",
            fileType: FileType.CSV,
            originalPath: "/path/to/not-image.csv",
            shouldBeInArchive: true,
            shouldBeInLocal: true,
          },
          microscopy: {
            wellIds: [8],
          },
        },
        {
          customMetadata: {
            annotations: [
              {
                annotationId: mockFavoriteColorAnnotation.annotationId,
                values: ["black"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                values: ["5"],
              },
            ],
            templateId: mockMMSTemplate.templateId,
          },
          file: {
            disposition: "tape",
            fileType: FileType.TEXT,
            originalPath: "/path/to/not-image.txt",
            shouldBeInArchive: true,
            shouldBeInLocal: true,
          },
          microscopy: {
            wellIds: [5],
          },
        },
      ];

      const payload = getUploadRequests(state);
      expect(standardizeUploads(payload)).to.have.deep.members(
          standardizeUploads(expected)
      );
    });

    it("Converts durations into milliseconds", () => {
      const duration: Duration = {
        days: 4,
        hours: 3,
        minutes: 2,
        seconds: 1.111,
      };
      const filePath = "/path/to/file.tiff";
      const state: State = {
        ...nonEmptyStateForInitiatingUpload,
        template: {
          appliedTemplate: mockIntervalTemplate,
          draft: {
            annotations: [],
          },
        },
        upload: getMockStateWithHistory({
          [filePath]: {
            file: filePath,
            ["Interval"]: [duration],
          },
        }),
      };

      const payload = getUploadRequests(state);

      expect(payload[0].customMetadata?.annotations[0].values[0]).to.equal(
          "356521111"
      );
    });

    it("Converts durations into milliseconds when only some units present", () => {
      const duration: Duration = {
        days: 0,
        hours: 0,
        minutes: 2,
        seconds: 1.111,
      };
      const filePath = "/path/to/file.tiff";
      const state: State = {
        ...nonEmptyStateForInitiatingUpload,
        template: {
          appliedTemplate: mockIntervalTemplate,
          draft: {
            annotations: [],
          },
        },
        upload: getMockStateWithHistory({
          [filePath]: {
            file: filePath,
            ["Interval"]: [duration],
          },
        }),
      };

      const payload = getUploadRequests(state);

      expect(payload[0].customMetadata?.annotations[0].values[0]).to.equal(
          "121111"
      );
    });
  });

  describe("getUploadFileNames", () => {
    it("returns empty array if no current upload", () => {
      const jobName = getUploadFileNames({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes: mockAnnotationTypes,
          annotations: [mockWellAnnotation, mockNotesAnnotation],
        },
        template: mockTemplateStateBranchWithAppliedTemplate,
        upload: getMockStateWithHistory({}),
      });
      expect(jobName).to.be.empty;
    });

    it("returns file name when singular file in upload", () => {
      const jobName = getUploadFileNames({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes: mockAnnotationTypes,
          annotations: [mockWellAnnotation, mockNotesAnnotation],
        },
        template: mockTemplateStateBranchWithAppliedTemplate,
        upload: getMockStateWithHistory({
          "/path/to/file3": mockWellUpload["/path/to/file3"],
        }),
      });
      expect(jobName).to.deep.equal(["file3"]);
    });

    it("returns file names in correct order", () => {
      const jobName = getUploadFileNames({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          annotationTypes: mockAnnotationTypes,
          annotations: [mockWellAnnotation, mockNotesAnnotation],
        },
        template: mockTemplateStateBranchWithAppliedTemplate,
        upload: getMockStateWithHistory(mockWellUpload),
      });
      expect(jobName).to.deep.equal(["file1", "file2", "file3"]);
    });
  });

  describe("getUploadAsTableRows", () => {
    it("handles files", () => {
      const rows = getUploadAsTableRows({
        ...mockState,
        selection: mockSelection,
        upload: getMockStateWithHistory({
          "/path/to/file1": {
            barcode: "1234",
            ["Favorite Color"]: ["Red"],
            file: "/path/to/file1",
            key: "/path/to/file1",
            [AnnotationName.WELL]: [1],
          },
          "/path/to/file2": {
            barcode: "1235",
            ["Favorite Color"]: ["Red"],
            file: "/path/to/file2",
            key: "/path/to/file2",
            [AnnotationName.WELL]: [2],
          },
          "/path/to/file3": {
            barcode: "1236",
            ["Favorite Color"]: ["Red"],
            file: "/path/to/file3",
            key: "/path/to/file3",
            [AnnotationName.WELL]: [1, 2, 3],
          },
        }),
      });
      expect(rows.length).to.equal(3);
      expect(rows).to.deep.include({
        barcode: "1234",
        ["Favorite Color"]: ["Red"],
        file: "/path/to/file1",
        key: "/path/to/file1",
        [AnnotationName.IMAGING_SESSION]: [],
        [AnnotationName.NOTES]: [],
        [AnnotationName.PLATE_BARCODE]: [],
        [AnnotationName.WELL]: [1],
      });
      expect(rows).to.deep.include({
        barcode: "1235",
        ["Favorite Color"]: ["Red"],
        file: "/path/to/file2",
        key: "/path/to/file2",
        [AnnotationName.IMAGING_SESSION]: [],
        [AnnotationName.NOTES]: [],
        [AnnotationName.PLATE_BARCODE]: [],
        [AnnotationName.WELL]: [2],
      });
      expect(rows).to.deep.include({
        barcode: "1236",
        ["Favorite Color"]: ["Red"],
        file: "/path/to/file3",
        key: "/path/to/file3",
        [AnnotationName.IMAGING_SESSION]: [],
        [AnnotationName.NOTES]: [],
        [AnnotationName.PLATE_BARCODE]: [],
        [AnnotationName.WELL]: [1, 2, 3],
      });
    });
    it("does not throw error for annotations that don't exist on the template", () => {
      const file = "/path/to/file1";
      const getRows = () =>
          getUploadAsTableRows({
            ...nonEmptyStateForInitiatingUpload,
            template: {
              ...mockState.template,
              appliedTemplate: {
                ...mockAuditInfo,
                annotations: [mockFavoriteColorTemplateAnnotation],
                name: "foo",
                templateId: 1,
                version: 1,
              },
            },
            upload: getMockStateWithHistory({
              [file]: {
                barcode: "1234",
                favoriteColor: "Red",
                file,
                [AnnotationName.NOTES]: [],
                somethingUnexpected: "Hello World",
                [AnnotationName.WELL]: [],
              },
            }),
          });
      expect(getRows).to.not.throw();
    });
  });

  describe("getFileToAnnotationHasValueMap", () => {
    const file = "/path/to/file1";
    it("sets annotations with empty arrays or nil values as false", () => {
      const result = getFileToAnnotationHasValueMap({
        ...mockState,
        upload: getMockStateWithHistory({
          [file]: {
            age: undefined,
            barcode: "abcd",
            file,
            [AnnotationName.NOTES]: [],
            [AnnotationName.WELL]: [],
          },
        }),
      });
      expect(result[file]).to.deep.equal({
        age: false,
        barcode: true,
        file: true,
        [AnnotationName.NOTES]: false,
        [AnnotationName.WELL]: false,
      });
    });
  });

  describe("getUploadKeyToAnnotationErrorMap", () => {
    const file = "/path/to/file1";
    let goodUploadRow: FileModel;
    const getValidations = (
        annotationToTest: TemplateAnnotation,
        value: any
    ) => {
      return getUploadKeyToAnnotationErrorMap({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: mockTemplateWithManyValues,
        },
        upload: getMockStateWithHistory({
          [file]: {
            ...goodUploadRow,
            [annotationToTest.name]: value,
          },
        }),
      });
    };

    beforeEach(() => {
      goodUploadRow = {
        "Another Garbage Text Annotation": ["valid", "valid"],
        "Birth Date": [new Date()],
        Cas9: ["spCas9"],
        "Clone Number Garbage": [1, 2, 3],
        Dropdown: [],
        Qc: [false],
        barcode: "",
        file: "/path/to/file3",
        [AnnotationName.NOTES]: [],
        [AnnotationName.WELL]: [],
      };
    });
    it("returns empty object if no validation errors", () => {
      const result = getUploadKeyToAnnotationErrorMap({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: mockTemplateWithManyValues,
        },
        upload: getMockStateWithHistory({
          [file]: goodUploadRow,
        }),
      });
      expect(result).to.deep.equal({});
    });
    it("sets error if an annotation value is not an array", () => {
      const result = getValidations(mockTextAnnotation, "BAD, BAD, BAD");
      expect(result).to.deep.equal({
        [file]: {
          [mockTextAnnotation.name]: "Invalid format, expected list",
        },
      });
    });
    it("sets error if a lookup annotation contains a value that is not an annotation option", () => {
      const result = getValidations(mockLookupAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [file]: {
          [mockLookupAnnotation.name]:
              "BAD did not match any of the expected values: spCas9, Not Recorded",
        },
      });
    });
    it("sets error if a dropdown annotation contains a value that is not a dropdown option", () => {
      const result = getValidations(mockDropdownAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [file]: {
          [mockDropdownAnnotation.name]:
              "BAD did not match any of the expected values: A, B, C, D",
        },
      });
    });
    it("sets error if a boolean annotation contains a value that is not a boolean", () => {
      const result = getValidations(mockBooleanAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [file]: {
          [mockBooleanAnnotation.name]:
              "BAD did not match expected type: YesNo",
        },
      });
    });
    it("sets error if a text annotation contains a value that is not text", () => {
      const result = getValidations(mockTextAnnotation, [1]);
      expect(result).to.deep.equal({
        [file]: {
          [mockTextAnnotation.name]: "1 did not match expected type: Text",
        },
      });
    });
    it("sets error if a number annotation contains a value that is not number", () => {
      const result = getValidations(mockNumberAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [file]: {
          [mockNumberAnnotation.name]:
              "BAD did not match expected type: Number",
        },
      });
    });
    it("sets error if a date annotation contains a value that is not date", () => {
      const result = getValidations(mockDateAnnotation, ["1-20"]);
      expect(result).to.deep.equal({
        [file]: {
          [mockDateAnnotation.name]:
              "1-20 did not match expected type: Date or DateTime",
        },
      });
    });
    it("sets error if a datetime annotation contains a value that is not datetime", () => {
      const result = getValidations(mockDateTimeAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [file]: {
          [mockDateTimeAnnotation.name]:
              "BAD did not match expected type: Date or DateTime",
        },
      });
    });
  });

  describe("getUploadValidationErrors", () => {
    it("returns empty error array if no template is supplied", () => {
      const errors = getUploadValidationErrors(mockState);
      expect(errors).to.be.empty;
    });
    it("adds error if non-ASCII character is provided", () => {
      const value = "Hello";
      const annotation = "A Text Annotation";
      const errors = getUploadValidationErrors({
        ...mockState,
        upload: getMockStateWithHistory({
          foo: {
            barcode: "abc",
            file: "foo",
            key: "foo",
            [AnnotationName.NOTES]: ["Valid String"],
            [AnnotationName.WELL]: [1],
            [annotation]: [value],
          },
        }),
      });
      expect(
          errors.includes(
              `Annotations cannot have special characters like in "${value}" for ${annotation}`
          )
      );
    });
    it("adds error if a row does not have a well annotation and is meant to", () => {
      const errors = getUploadValidationErrors({
        ...nonEmptyStateForInitiatingUpload,
        selection: {
          ...nonEmptyStateForInitiatingUpload.selection,
        },
        upload: getMockStateWithHistory({
          foo: {
            "Favorite Color": 1,
            file: "foo",
            key: "foo",
            [AnnotationName.NOTES]: [],
            [AnnotationName.PLATE_BARCODE]: ["1491201"],
            [AnnotationName.WELL]: [],
          },
        }),
      });
      expect(
          errors.includes(
              `"foo" is missing the following required annotations: ${AnnotationName.WELL}`
          )
      ).to.be.true;
    });
    it("adds error if row is missing an annotation value that is required", () => {
      const errors = getUploadValidationErrors({
        ...nonEmptyStateForInitiatingUpload,
        upload: getMockStateWithHistory({
          foo: {
            "Favorite Color": undefined,
            barcode: "abc",
            file: "foo",
            key: "foo",
            [AnnotationName.NOTES]: [],
            [AnnotationName.WELL]: [1],
          },
        }),
      });
      expect(
          errors.includes(
              '"foo" is missing the following required annotations: Favorite Color'
          )
      ).to.be.true;
    });
    it("adds error if imaging sessions available, but not selected", () => {
      const plateBarcode = "1230941";
      const errors = getUploadValidationErrors({
        ...nonEmptyStateForInitiatingUpload,
        metadata: {
          ...nonEmptyStateForInitiatingUpload.metadata,
          plateBarcodeToPlates: {
            [plateBarcode]: [
              {
                name: "2 hours",
                imagingSessionId: 3,
                wells: [],
              },
            ],
          },
        },
        upload: getMockStateWithHistory({
          foo: {
            "Favorite Color": ["blue"],
            barcode: "abc",
            file: "foo",
            key: "foo",
            [AnnotationName.NOTES]: [],
            [AnnotationName.IMAGING_SESSION]: [],
            [AnnotationName.PLATE_BARCODE]: [plateBarcode],
            [AnnotationName.WELL]: [1],
          },
        }),
      });
      expect(
          errors.includes(
              `"foo" is missing the following required annotations: ${AnnotationName.IMAGING_SESSION}`
          )
      ).to.be.true;
    });
    it("adds error if an annotation value is not formatted correctly", () => {
      const file = "foo";
      const errors = getUploadValidationErrors({
        ...nonEmptyStateForInitiatingUpload,
        upload: getMockStateWithHistory({
          [file]: {
            "Favorite Color": "red",
            barcode: "1234",
            file,
            key: file,
            [AnnotationName.NOTES]: [],
            [AnnotationName.WELL]: [1],
          },
        }),
      });
      expect(
          errors.includes(
              "Unexpected format for annotation type. Hover red x icons for more information."
          )
      ).to.be.true;
    });
  });
});
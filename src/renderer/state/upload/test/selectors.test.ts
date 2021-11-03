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
  mockChannel,
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
import { getUploadRowKey } from "../constants";
import {
  getCanUndoUpload,
  getFileToAnnotationHasValueMap,
  getUploadFileNames,
  getUploadKeyToAnnotationErrorMap,
  getUploadRequests,
} from "../selectors";
import { getUploadAsTableRows, getUploadValidationErrors } from "../selectors";
import { FileType, MMSAnnotationValueRequest } from "../types";

const orderAnnotationValueRequests = (
  annotations: MMSAnnotationValueRequest[]
) => {
  return orderBy(annotations, [
    "annotationId",
    "positionId",
    "scene",
    "subImageName",
    "channelId",
  ]);
};

// utility function to allow us to deeply compare expected and actual output without worrying about order
const standardizeUploads = (uploadRequests: UploadRequest[]): UploadRequest[] =>
  uploadRequests.map((request) => ({
    ...request,
    customMetadata: {
      ...request.customMetadata,
      annotations: orderAnnotationValueRequests(
        request.customMetadata?.annotations || []
      ),
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
          [getUploadRowKey({ file })]: {
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
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
            ["Favorite Color"]: ["blue"],
            [AnnotationName.NOTES]: [],
            plateId: 4,
            [AnnotationName.WELL]: [],
          },
          "/path/to.dot/image.tiffscene:1channel:1": {
            barcode: "452",
            channelId: "Raw 468 nm",
            ["Favorite Color"]: "yellow",
            file: "/path/to.dot/image.tiff",
            [AnnotationName.NOTES]: ["Seeing some interesting things here!"],
            plateId: 4,
            positionIndex: 1,
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
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
                values: ["blue"],
              },
              {
                annotationId: mockFavoriteColorAnnotation.annotationId,
                channelId: mockChannel.channelId,
                positionIndex: 1,
                scene: undefined,
                subImageName: undefined,
                values: ["yellow"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: mockChannel.channelId,
                positionIndex: 1,
                scene: undefined,
                subImageName: undefined,
                values: ["6"],
              },
              {
                annotationId: mockNotesAnnotation.annotationId,
                channelId: mockChannel.channelId,
                positionIndex: 1,
                scene: undefined,
                subImageName: undefined,
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
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
                values: ["red"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
                values: ["green"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
                values: ["purple"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
                values: ["orange"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
                values: ["pink"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
                values: ["gold"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
                values: ["grey"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
                values: ["black"],
              },
              {
                annotationId: mockWellAnnotation.annotationId,
                channelId: undefined,
                positionIndex: undefined,
                scene: undefined,
                subImageName: undefined,
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
          [getUploadRowKey({ file: "/path/to/file3" })]: mockWellUpload[
            getUploadRowKey({ file: "/path/to/file3" })
          ],
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
    it("handles files without scenes or channels", () => {
      const rows = getUploadAsTableRows({
        ...mockState,
        selection: mockSelection,
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file1" })]: {
            barcode: "1234",
            ["Favorite Color"]: ["Red"],
            file: "/path/to/file1",
            key: getUploadRowKey({ file: "/path/to/file1" }),
            [AnnotationName.WELL]: [1],
          },
          [getUploadRowKey({ file: "/path/to/file2" })]: {
            barcode: "1235",
            ["Favorite Color"]: ["Red"],
            file: "/path/to/file2",
            key: getUploadRowKey({ file: "/path/to/file2" }),
            [AnnotationName.WELL]: [2],
          },
          [getUploadRowKey({ file: "/path/to/file3" })]: {
            barcode: "1236",
            ["Favorite Color"]: ["Red"],
            file: "/path/to/file3",
            key: getUploadRowKey({ file: "/path/to/file3" }),
            [AnnotationName.WELL]: [1, 2, 3],
          },
        }),
      });
      expect(rows.length).to.equal(3); // no rows expanded yet so excluding the row with a positionIndex
      expect(rows).to.deep.include({
        barcode: "1234",
        [AnnotationName.CHANNEL_TYPE]: [],
        ["Favorite Color"]: ["Red"],
        file: "/path/to/file1",
        key: getUploadRowKey({ file: "/path/to/file1" }),
        [AnnotationName.IMAGING_SESSION]: [],
        [AnnotationName.NOTES]: [],
        [AnnotationName.PLATE_BARCODE]: [],
        positionIndexes: [],
        scenes: [],
        subImageNames: [],
        subRows: [],
        [AnnotationName.WELL]: [1],
      });
      expect(rows).to.deep.include({
        barcode: "1235",
        [AnnotationName.CHANNEL_TYPE]: [],
        ["Favorite Color"]: ["Red"],
        file: "/path/to/file2",
        key: getUploadRowKey({ file: "/path/to/file2" }),
        [AnnotationName.IMAGING_SESSION]: [],
        [AnnotationName.NOTES]: [],
        [AnnotationName.PLATE_BARCODE]: [],
        positionIndexes: [],
        scenes: [],
        subImageNames: [],
        subRows: [],
        [AnnotationName.WELL]: [2],
      });
      expect(rows).to.deep.include({
        barcode: "1236",
        [AnnotationName.CHANNEL_TYPE]: [],
        ["Favorite Color"]: ["Red"],
        file: "/path/to/file3",
        key: getUploadRowKey({ file: "/path/to/file3" }),
        [AnnotationName.IMAGING_SESSION]: [],
        [AnnotationName.NOTES]: [],
        [AnnotationName.PLATE_BARCODE]: [],
        positionIndexes: [],
        scenes: [],
        subImageNames: [],
        subRows: [],
        [AnnotationName.WELL]: [1, 2, 3],
      });
    });
    it("shows scene and channel only rows if file row is not present", () => {
      const rows = getUploadAsTableRows({
        ...mockState,
        selection: mockSelection,
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file1", positionIndex: 1 })]: {
            barcode: "1234",
            file: "/path/to/file1",
            key: getUploadRowKey({ file: "/path/to/file1", positionIndex: 1 }),
            [AnnotationName.NOTES]: [],
            positionIndex: 1,
            [AnnotationName.WELL]: [2],
          },
          [getUploadRowKey({
            file: "/path/to/file1",
            positionIndex: undefined,
            channelId: "Raw 405nm",
          })]: {
            barcode: "1234",
            channelId: "Raw 405nm",
            file: "/path/to/file1",
            key: getUploadRowKey({
              file: "/path/to/file1",
              positionIndex: undefined,
              channelId: "Raw 405nm",
            }),
            [AnnotationName.NOTES]: [],
            positionIndex: undefined,
            [AnnotationName.WELL]: [2],
          },
        }),
      });
      expect(rows.length).to.equal(2);
      expect(rows[0]).to.deep.equal({
        barcode: "1234",
        channelId: "Raw 405nm",
        [AnnotationName.CHANNEL_TYPE]: [],
        [AnnotationName.IMAGING_SESSION]: [],
        file: "/path/to/file1",
        key: getUploadRowKey({
          file: "/path/to/file1",
          positionIndex: undefined,
          channelId: "Raw 405nm",
        }),
        [AnnotationName.NOTES]: [],
        [AnnotationName.PLATE_BARCODE]: [],
        positionIndex: undefined,
        positionIndexes: [],
        scenes: [],
        subImageNames: [],
        subRows: [],
        [AnnotationName.WELL]: [2],
      });
      expect(rows[1]).to.deep.equal({
        barcode: "1234",
        [AnnotationName.CHANNEL_TYPE]: [],
        file: "/path/to/file1",
        key: getUploadRowKey({ file: "/path/to/file1", positionIndex: 1 }),
        [AnnotationName.IMAGING_SESSION]: [],
        [AnnotationName.NOTES]: [],
        [AnnotationName.PLATE_BARCODE]: [],
        positionIndex: 1,
        positionIndexes: [],
        scenes: [],
        subImageNames: [],
        subRows: [],
        [AnnotationName.WELL]: [2],
      });
    });
    it("handles files with channels", () => {
      const rows = getUploadAsTableRows({
        ...mockState,
        selection: {
          ...mockSelection,
        },
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file1" })]: {
            barcode: "1234",
            [AnnotationName.CHANNEL_TYPE]: ["Raw 405nm"],
            file: "/path/to/file1",
            [AnnotationName.NOTES]: undefined,
            [AnnotationName.WELL]: [1],
          },
          [getUploadRowKey({
            file: "/path/to/file1",
            positionIndex: undefined,
            channelId: "Raw 405nm",
          })]: {
            barcode: "1234",
            channelId: "Raw 405nm",
            file: "/path/to/file1",
            [AnnotationName.NOTES]: undefined,
            positionIndex: undefined,
            [AnnotationName.WELL]: [],
          },
        }),
      });
      expect(rows).to.be.lengthOf(1);
      expect(rows[0].subRows).to.be.lengthOf(1);
    });
    it("handles files with scenes and channels", () => {
      const rows = getUploadAsTableRows({
        ...mockState,
        selection: {
          ...mockSelection,
        },
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file: "/path/to/file1" })]: {
            barcode: "1234",
            [AnnotationName.CHANNEL_TYPE]: ["Raw 405nm"],
            file: "/path/to/file1",
            [AnnotationName.NOTES]: [],
            [AnnotationName.WELL]: [],
          },
          [getUploadRowKey({ file: "/path/to/file1", positionIndex: 1 })]: {
            barcode: "1234",
            file: "/path/to/file1",
            [AnnotationName.NOTES]: [],
            positionIndex: 1,
            [AnnotationName.WELL]: [],
          },
          [getUploadRowKey({
            file: "/path/to/file1",
            positionIndex: 1,
            channelId: "Raw 405nm",
          })]: {
            barcode: "1234",
            channelId: "Raw 405nm",
            file: "/path/to/file1",
            [AnnotationName.NOTES]: [],
            positionIndex: 1,
            [AnnotationName.WELL]: [1],
          },
          [getUploadRowKey({
            file: "/path/to/file1",
            positionIndex: undefined,
            channelId: "Raw 405nm",
          })]: {
            barcode: "1234",
            channelId: "Raw 405nm",
            file: "/path/to/file1",
            [AnnotationName.NOTES]: [],
            [AnnotationName.WELL]: [],
          },
        }),
      });
      expect(rows).to.be.lengthOf(1);
      expect(rows[0].subRows).to.be.lengthOf(2);
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
            [getUploadRowKey({ file })]: {
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
          [getUploadRowKey({ file })]: {
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

    it("sets annotation to true if one of the dimensions has that annotation set for a file", () => {
      const result = getFileToAnnotationHasValueMap({
        ...mockState,
        upload: getMockStateWithHistory({
          [getUploadRowKey({ file })]: {
            age: undefined,
            barcode: "abcd",
            file,
            [AnnotationName.NOTES]: [],
            [AnnotationName.WELL]: [],
          },
          [getUploadRowKey({ file, positionIndex: 1 })]: {
            age: undefined,
            barcode: "abcd",
            file,
            [AnnotationName.NOTES]: [],
            [AnnotationName.WELL]: [1],
          },
          [getUploadRowKey({
            file,
            positionIndex: 1,
            channelId: "Raw 405 nm",
          })]: {
            age: 19,
            barcode: "abcd",
            file,
            [AnnotationName.NOTES]: [],
            [AnnotationName.WELL]: [],
          },
        }),
      });
      expect(result[file]).to.deep.equal({
        age: true,
        barcode: true,
        file: true,
        [AnnotationName.NOTES]: false,
        [AnnotationName.WELL]: true,
      });
    });
  });

  describe("getUploadKeyToAnnotationErrorMap", () => {
    const uploadRowKey = getUploadRowKey({ file: "/path/to/file1" });
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
          [uploadRowKey]: {
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
          [uploadRowKey]: goodUploadRow,
        }),
      });
      expect(result).to.deep.equal({});
    });
    it("sets error if an annotation value is not an array", () => {
      const result = getValidations(mockTextAnnotation, "BAD, BAD, BAD");
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockTextAnnotation.name]: "Invalid format, expected list",
        },
      });
    });
    it("sets error if a lookup annotation contains a value that is not an annotation option", () => {
      const result = getValidations(mockLookupAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockLookupAnnotation.name]:
            "BAD did not match any of the expected values: spCas9, Not Recorded",
        },
      });
    });
    it("sets error if a dropdown annotation contains a value that is not a dropdown option", () => {
      const result = getValidations(mockDropdownAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockDropdownAnnotation.name]:
            "BAD did not match any of the expected values: A, B, C, D",
        },
      });
    });
    it("sets error if a boolean annotation contains a value that is not a boolean", () => {
      const result = getValidations(mockBooleanAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockBooleanAnnotation.name]:
            "BAD did not match expected type: YesNo",
        },
      });
    });
    it("sets error if a text annotation contains a value that is not text", () => {
      const result = getValidations(mockTextAnnotation, [1]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockTextAnnotation.name]: "1 did not match expected type: Text",
        },
      });
    });
    it("sets error if a number annotation contains a value that is not number", () => {
      const result = getValidations(mockNumberAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockNumberAnnotation.name]:
            "BAD did not match expected type: Number",
        },
      });
    });
    it("sets error if a date annotation contains a value that is not date", () => {
      const result = getValidations(mockDateAnnotation, ["1-20"]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
          [mockDateAnnotation.name]:
            "1-20 did not match expected type: Date or DateTime",
        },
      });
    });
    it("sets error if a datetime annotation contains a value that is not datetime", () => {
      const result = getValidations(mockDateTimeAnnotation, ["BAD"]);
      expect(result).to.deep.equal({
        [uploadRowKey]: {
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
          [getUploadRowKey({ file: "foo" })]: {
            barcode: "abc",
            file: "foo",
            key: getUploadRowKey({ file: "foo" }),
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
          [getUploadRowKey({ file: "foo" })]: {
            "Favorite Color": 1,
            file: "foo",
            key: getUploadRowKey({ file: "foo" }),
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
          [getUploadRowKey({ file: "foo" })]: {
            "Favorite Color": undefined,
            barcode: "abc",
            file: "foo",
            key: getUploadRowKey({ file: "foo" }),
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
          [getUploadRowKey({ file: "foo" })]: {
            "Favorite Color": ["blue"],
            barcode: "abc",
            file: "foo",
            key: getUploadRowKey({ file: "foo" }),
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
      const key = getUploadRowKey({ file });
      const errors = getUploadValidationErrors({
        ...nonEmptyStateForInitiatingUpload,
        upload: getMockStateWithHistory({
          [key]: {
            "Favorite Color": "red",
            barcode: "1234",
            file,
            key,
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

import { expect } from "chai";

import { AnnotationName } from "../../../constants";
import {
  getMockStateWithHistory,
  mockSelection,
  mockState,
  mockSuccessfulUploadJob,
  mockWellUpload,
  nonEmptyStateForInitiatingUpload,
} from "../../../state/test/mocks";
import { AsyncRequest } from "../../../state/types";
import { getCanSubmitUpload, getIsUploadInProgress } from "../selectors";

describe("AddCustomData selectors", () => {
  describe("getCanSubmitUpload", () => {
    it("returns true if selected job and job successful", () => {
      const result = getCanSubmitUpload({
        ...nonEmptyStateForInitiatingUpload,
        selection: {
          ...mockSelection,
          uploads: [mockSuccessfulUploadJob],
        },
      });
      expect(result).to.be.true;
    });
    it("returns true if working on new upload and no requests in progress", () => {
      const result = getCanSubmitUpload(nonEmptyStateForInitiatingUpload);
      expect(result).to.be.true;
    });
    it("returns true if editing an upload and has made changes and no requests in progress", () => {
      const result = getCanSubmitUpload({
        ...nonEmptyStateForInitiatingUpload,
        metadata: {
          ...nonEmptyStateForInitiatingUpload.metadata,
          originalUpload: {},
        },
      });
      expect(result).to.be.true;
    });
    it("returns false if editing an upload but have not made changes", () => {
      const result = getCanSubmitUpload({
        ...nonEmptyStateForInitiatingUpload,
        metadata: {
          ...nonEmptyStateForInitiatingUpload.metadata,
          originalUpload: mockWellUpload,
        },
      });
      expect(result).to.be.false;
    });
  });
  describe("uploadInProgress", () => {
    it("returns false if no current job name", () => {
      const result = getIsUploadInProgress(mockState);
      expect(result).to.be.false;
    });
    it("returns true if requestsInProgress contains UPDATE_FILE_METADATA-jobName", () => {
      const result = getIsUploadInProgress({
        ...nonEmptyStateForInitiatingUpload,
        feedback: {
          ...nonEmptyStateForInitiatingUpload.feedback,
          requestsInProgress: [`${AsyncRequest.UPDATE_FILE_METADATA}-file1`],
        },
      });
      expect(result).to.be.true;
    });
    it("returns false if requestsInProgress doesn't contain UPDATE_FILE_METADATA-jobName", () => {
      const result = getIsUploadInProgress({
        ...nonEmptyStateForInitiatingUpload,
        feedback: {
          ...nonEmptyStateForInitiatingUpload.feedback,
          requestsInProgress: [`${AsyncRequest.UPDATE_FILE_METADATA}-other`],
        },
      });
      expect(result).to.be.false;
    });

    it("returns false if requestsInProgress does not contain INITIATE_UPLOAD-currentUploadName", () => {
      const inProgress = getIsUploadInProgress(mockState);
      expect(inProgress).to.be.false;
    });
    it("returns false if requestsInProgress contains request belonging to a different upload", () => {
      const inProgress = getIsUploadInProgress({
        ...mockState,
        feedback: {
          ...mockState.feedback,
          requestsInProgress: [`${AsyncRequest.INITIATE_UPLOAD}-bar`],
        },
        metadata: {
          ...mockState.metadata,
          currentUploadFilePath: "/path/foo.json",
        },
        upload: getMockStateWithHistory({
          foo: {
            barcode: "1234",
            file: "foo",
            [AnnotationName.WELL]: [1],
          },
        }),
      });
      expect(inProgress).to.be.false;
    });
  });
});

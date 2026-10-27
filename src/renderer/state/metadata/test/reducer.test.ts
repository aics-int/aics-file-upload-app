import { expect } from "chai";

import { AnnotationOption } from "../../../services/labkey-client/types";
import {
  viewUploads,
  resetUpload,
  viewUploadsSucceeded,
} from "../../route/actions";
import {
  mockState,
  mockSuccessfulUploadJob,
  mockWellUpload,
} from "../../test/mocks";
import { replaceUpload, saveUploadDraftSuccess } from "../../upload/actions";
import {
  clearOptionsForLookup,
  receiveMetadata,
  resetHistory,
  receiveProgramOptions,
  startWellLookup,
  finishWellLookup,
} from "../actions";
import reducer from "../reducer";
import { initialState } from "../reducer";

describe("metadata reducer", () => {
  const filePath = "/foo/bar/test.json";
  describe("clearOptionsForLookup", () => {
    it("sets options to an empty array", () => {
      const result = reducer(
        { ...initialState, "Cell Lines": [{}, {}] },
        clearOptionsForLookup("Cell Lines")
      );
      expect(result["Cell Lines"]).to.be.empty;
    });
  });
  describe("receiveMetadata", () => {
    it("adds metadata from payload", () => {
      const result = reducer(initialState, receiveMetadata({ color: "red" }));
      expect(result.color).to.equal("red");
    });
  });
  describe("resetHistory", () => {
    it("resets selection and upload history", () => {
      const result = reducer(initialState, resetHistory());
      expect(result.history).to.deep.equal({
        upload: {},
      });
    });
  });
  describe("replaceUpload", () => {
    it("sets currentUploadFilePath", () => {
      const result = reducer(initialState, replaceUpload(filePath, mockState));
      expect(result.currentUploadFilePath).to.not.be.undefined;
    });
  });
  describe("resetUpload", () => {
    it("clears currentUploadFilePath", () => {
      const result = reducer(
        {
          ...initialState,
          currentUploadFilePath: filePath,
        },
        resetUpload()
      );
      expect(result.currentUpload).to.be.undefined;
    });
    it("clears originalUpload", () => {
      const result = reducer(
        {
          ...initialState,
          originalUpload: {},
        },
        resetUpload()
      );
      expect(result.originalUpload).to.be.undefined;
    });
  });
  describe("viewUploads", () => {
    it("clears currentUploadFilePath", () => {
      const result = reducer(
        {
          ...initialState,
          currentUploadFilePath: "/foo.json",
        },
        viewUploads([mockSuccessfulUploadJob])
      );
      expect(result.currentUploadFilePath).to.be.undefined;
    });
  });
  describe("viewUploadsSucceeded", () => {
    it("sets originalUpload", () => {
      const result = reducer(
        initialState,
        viewUploadsSucceeded(mockWellUpload)
      );
      expect(result.originalUploads).to.equal(mockWellUpload);
    });
  });
  describe("saveUploadDraftSuccess", () => {
    it("sets currentUploadFilePath", () => {
      const result = reducer(initialState, saveUploadDraftSuccess("/path"));
      expect(result.currentUploadFilePath).to.not.be.undefined;
    });
  });
  describe("receiveProgramOptions", () => {
    it("sets programOptions in state", () => {
      // Got these from labkey
      const fakeOptions: AnnotationOption[] = [
        { annotationOptionId: 150, annotationId: 153, value: "Variance" },
        { annotationOptionId: 151, annotationId: 153, value: "EMT" },
        { annotationOptionId: 152, annotationId: 153, value: "Diff_states" },
        { annotationOptionId: 153, annotationId: 153, value: "NucMorph" },
        {
          annotationOptionId: 154,
          annotationId: 153,
          value: "IntegratedNucleus",
        },
      ];

      const result = reducer(initialState, receiveProgramOptions(fakeOptions));
      expect(result.programOptions).to.deep.equal(fakeOptions);
    });
  });
  describe("start/finishWellLookup", () => {
    const mockRowId = "abc";
    it("sets an untracked row to 1", () => {
      const result = reducer(initialState, startWellLookup(mockRowId));
      expect(result.loadingWellFileKeys?.[mockRowId]).to.equal(1);
    });
    it("increments/decrements an already tracked row", () => {
      const mockState = {
        ...initialState,
        loadingWellFileKeys: { [mockRowId]: 1 },
      };
      const afterStart = reducer(mockState, startWellLookup(mockRowId));
      const result = reducer(afterStart, finishWellLookup(mockRowId));

      expect(afterStart.loadingWellFileKeys?.[mockRowId]).to.equal(2);
      expect(result.loadingWellFileKeys?.[mockRowId]).to.equal(1);
    });
    it("removes a row when count becomes zero", () => {
      const afterStart = reducer(initialState, startWellLookup(mockRowId));
      const result = reducer(afterStart, finishWellLookup(mockRowId));
      expect(result.loadingWellFileKeys).to.deep.equal({});
    });
    it("avoids setting an untracked row to negative", () => {
      const result = reducer(initialState, finishWellLookup(mockRowId));
      expect(result.loadingWellFileKeys).to.deep.equal({});
    });
    it("handles multiple well records", () => {
      const mockRowId1 = "def";
      const mockRowId2 = "ghi";

      const startBoth = reducer(
        reducer(initialState, startWellLookup(mockRowId1)),
        startWellLookup(mockRowId2)
      );
      const endOne = reducer(startBoth, finishWellLookup(mockRowId1));
      const result = reducer(endOne, startWellLookup(mockRowId2));

      expect(Object.keys(startBoth.loadingWellFileKeys).length).to.equal(2);
      expect(startBoth.loadingWellFileKeys[mockRowId1]).to.equal(1);
      expect(startBoth.loadingWellFileKeys[mockRowId2]).to.equal(1);

      expect(Object.keys(result.loadingWellFileKeys).length).to.equal(1); // mockRowId1 has been removed
      expect(result.loadingWellFileKeys[mockRowId1]).to.be.undefined;
      expect(result.loadingWellFileKeys[mockRowId2]).to.equal(2);
    });
  });
});

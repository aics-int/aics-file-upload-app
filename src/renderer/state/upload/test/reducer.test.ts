import { expect } from "chai";

import { AnnotationName } from "../../../constants";
import { resetUpload } from "../../route/actions";
import { getMockStateWithHistory, mockState } from "../../test/mocks";
import { UploadStateBranch } from "../../types";
import {
  replaceUpload,
  updateUpload,
  updateUploadRows,
  updateUploads,
  autofillFromMXS,
} from "../actions";
import reducer from "../reducer";

describe("upload reducer", () => {
  let uploads: UploadStateBranch;

  beforeEach(() => {
    uploads = {
      foo: {
        barcode: "1234",
        file: "/path",
        [AnnotationName.WELL]: [1, 2],
      },
      bar: {
        barcode: "1235",
        file: "/path2",
        [AnnotationName.WELL]: [1, 2],
      },
    };
  });
  describe("updateUpload", () => {
    it("does not change anything if key doesn't exist on upload", () => {
      const result = reducer(
        getMockStateWithHistory({}),
        updateUpload("foo", { [AnnotationName.WELL]: [1, 2] })
      );
      const { present } = result;
      expect(present).to.be.empty;
    });

    it("updates upload at key specified", () => {
      const result = reducer(
        getMockStateWithHistory(uploads),
        updateUpload("foo", { [AnnotationName.WELL]: [3] })
      );
      const { present } = result;
      expect(present.foo[AnnotationName.WELL]).to.deep.equal([3]);
    });

    it("resets imaging session and well when plate barcode changes", () => {
      // Arrange
      const state = getMockStateWithHistory({
        ...uploads,
        foo: {
          ...uploads.foo,
          [AnnotationName.IMAGING_SESSION]: ["4 hours"],
        },
      });
      const expected = {
        ...uploads,
        foo: {
          ...uploads.foo,
          [AnnotationName.PLATE_BARCODE]: ["149231"],
          [AnnotationName.IMAGING_SESSION]: [],
          [AnnotationName.WELL]: [],
        },
      };

      // Act
      const result = reducer(
        state,
        updateUpload("foo", { [AnnotationName.PLATE_BARCODE]: ["149231"] })
      );

      // Assert
      expect(result.present).to.deep.equal(expected);
    });

    it("resets well when imaging session changes", () => {
      // Arrange
      const state = getMockStateWithHistory({
        ...uploads,
        foo: {
          ...uploads.foo,
          [AnnotationName.IMAGING_SESSION]: [],
        },
      });
      const expected = {
        ...uploads,
        foo: {
          ...uploads.foo,
          [AnnotationName.IMAGING_SESSION]: ["4 hours"],
          [AnnotationName.WELL]: [],
        },
      };

      // Act
      const result = reducer(
        state,
        updateUpload("foo", { [AnnotationName.IMAGING_SESSION]: ["4 hours"] })
      );

      // Assert
      expect(result.present).to.deep.equal(expected);
    });
  });

  describe("updateUploadRows", () => {
    it("performs update", () => {
      // Arrange
      const keyToChange = "abc123";
      const state = getMockStateWithHistory({
        [keyToChange]: {
          file: keyToChange,
          color: "blue",
          date: "today",
        },
        keyToNotChange: {
          file: "keyToNotChange",
          color: "green",
        },
      });
      const update = {
        color: "orange",
      };
      const expected = {
        ...state.present,
        [keyToChange]: {
          ...state.present[keyToChange],
          ...update,
        },
      };

      // Act
      const actual = reducer(state, updateUploadRows([keyToChange], update));

      // Assert
      expect(actual.present).to.deep.equal(expected);
    });

    it("do not reset well and imaging session if present in update when barcode is", () => {
      // Arrange
      const keyToChange = "392841243";
      const state = getMockStateWithHistory({
        [keyToChange]: {
          file: keyToChange,
          color: "green",
          [AnnotationName.PLATE_BARCODE]: ["1234121"],
          [AnnotationName.IMAGING_SESSION]: ["4 hours"],
          [AnnotationName.WELL]: [131, 21412],
        },
      });
      const update = {
        [AnnotationName.PLATE_BARCODE]: ["1239841234"],
        [AnnotationName.IMAGING_SESSION]: ["2 hours"],
        [AnnotationName.WELL]: [2349234],
      };
      const expected = {
        ...state.present,
        [keyToChange]: {
          ...state.present[keyToChange],
          ...update,
        },
      };

      // Act
      const actual = reducer(
        state,
        updateUploadRows(Object.keys(expected), update)
      );

      // Assert
      expect(actual.present).to.deep.equal(expected);
    });

    it("do not reset imaging session if present in update when imaging session is", () => {
      // Arrange
      const keyToChange = "392841243";
      const state = getMockStateWithHistory({
        [keyToChange]: {
          file: keyToChange,
          color: "green",
          [AnnotationName.PLATE_BARCODE]: ["1234121"],
          [AnnotationName.IMAGING_SESSION]: ["4 hours"],
          [AnnotationName.WELL]: [131, 21412],
        },
      });
      const update = {
        [AnnotationName.PLATE_BARCODE]: ["1239841234"],
        [AnnotationName.IMAGING_SESSION]: ["2 hours"],
      };
      const expected = {
        ...state.present,
        [keyToChange]: {
          ...state.present[keyToChange],
          ...update,
          [AnnotationName.WELL]: [],
        },
      };

      // Act
      const actual = reducer(
        state,
        updateUploadRows(Object.keys(expected), update)
      );

      // Assert
      expect(actual.present).to.deep.equal(expected);
    });

    it("reset well and imaging session if not present in update when barcode is", () => {
      // Arrange
      const keyToChange = "392841243";
      const state = getMockStateWithHistory({
        [keyToChange]: {
          file: keyToChange,
          color: "green",
          [AnnotationName.PLATE_BARCODE]: ["1234121"],
          [AnnotationName.IMAGING_SESSION]: ["4 hours"],
          [AnnotationName.WELL]: [131, 21412],
        },
      });
      const update = {
        [AnnotationName.PLATE_BARCODE]: ["1239841234"],
      };
      const expected = {
        ...state.present,
        [keyToChange]: {
          ...state.present[keyToChange],
          ...update,
          [AnnotationName.IMAGING_SESSION]: [],
          [AnnotationName.WELL]: [],
        },
      };

      // Act
      const actual = reducer(
        state,
        updateUploadRows(Object.keys(expected), update)
      );

      // Assert
      expect(actual.present).to.deep.equal(expected);
    });
  });

  describe("replaceUpload", () => {
    it("replaces entire upload with upload in draft", () => {
      const uploadPartial = {
        barcode: "5678",
        file: "/path2",
        [AnnotationName.WELL]: [9],
      };
      const draft = {
        ...mockState,
        upload: getMockStateWithHistory({
          bar: uploadPartial,
        }),
      };
      const result = reducer(
        getMockStateWithHistory(uploads),
        replaceUpload("/path/file.json", draft)
      );
      const { present } = result;
      expect(present.foo).to.be.undefined;
      expect(present.bar).to.equal(uploadPartial);
    });
  });
  describe("resetUpload", () => {
    it("clears all uploads", () => {
      const result = reducer(getMockStateWithHistory(uploads), resetUpload());
      const { present } = result;
      expect(present).to.be.empty;
    });
  });
  describe("updateUploads", () => {
    it("replaces entire upload if payload.clearAll is true", () => {
      const result = reducer(
        getMockStateWithHistory(uploads),
        updateUploads({ someKey: { file: "/path/test.txt" } }, true)
      );
      expect(result.present.foo).to.be.undefined;
    });
    it("does not override parts of upload not covered in payload.replacement if payload.clearAll is false", () => {
      const result = reducer(
        getMockStateWithHistory(uploads),
        updateUploads({ someKey: { file: "/path/test.txt" } }, false)
      );
      expect(result.present.foo).to.not.be.undefined;
    });
  });
  describe("autofillFromMXS", () => {
    it("does not change anything if file doesn't exist in state", () => {
      const mxsResult = {
        "Favorite Color": { annotation_id: 1, value: "Blue" },
      };
      const result = reducer(
        getMockStateWithHistory({}),
        autofillFromMXS("/nonexistent/path", mxsResult)
      );
      expect(result.present).to.be.empty;
    });

    it("autofills empty fields with MXS data", () => {
      const filePath = "/path/to/file.czi";
      const initialState = {
        [filePath]: {
          file: filePath,
          "Favorite Color": [],
          "Other Field": [],
        },
      };
      const mxsResult = {
        "Favorite Color": { annotation_id: 1, value: "Blue" },
      };

      const result = reducer(
        getMockStateWithHistory(initialState),
        autofillFromMXS(filePath, mxsResult)
      );

      expect(result.present[filePath]["Favorite Color"]).to.deep.equal([
        "Blue",
      ]);
      expect(result.present[filePath].autofilledFields).to.deep.equal([
        "Favorite Color",
      ]);
    });

    it("overwrites existing user data with MXS values", () => {
      const filePath = "/path/to/file.czi";
      const initialState = {
        [filePath]: {
          file: filePath,
          "Favorite Color": ["Red"],
          "Other Field": [],
        },
      };
      const mxsResult = {
        "Favorite Color": { annotation_id: 1, value: "Blue" },
        "Other Field": { annotation_id: 2, value: "Test" },
      };

      const result = reducer(
        getMockStateWithHistory(initialState),
        autofillFromMXS(filePath, mxsResult)
      );

      expect(result.present[filePath]["Favorite Color"]).to.deep.equal([
        "Blue",
      ]);
      expect(result.present[filePath]["Other Field"]).to.deep.equal(["Test"]);
      expect(result.present[filePath].autofilledFields).to.deep.equal([
        "Favorite Color",
        "Other Field",
      ]);
    });

    it("skips null and undefined values from MXS", () => {
      const filePath = "/path/to/file.czi";
      const initialState = {
        [filePath]: {
          file: filePath,
          "Field A": [],
          "Field B": [],
          "Field C": [],
        },
      };
      const mxsResult = {
        "Field A": { annotation_id: 1, value: null },
        "Field B": { annotation_id: 2, value: undefined as any },
        "Field C": { annotation_id: 3, value: "Valid" },
      };

      const result = reducer(
        getMockStateWithHistory(initialState),
        autofillFromMXS(filePath, mxsResult)
      );

      expect(result.present[filePath]["Field A"]).to.deep.equal([]);
      expect(result.present[filePath]["Field B"]).to.deep.equal([]);
      expect(result.present[filePath]["Field C"]).to.deep.equal(["Valid"]);
      expect(result.present[filePath].autofilledFields).to.deep.equal([
        "Field C",
      ]);
    });

    it("skips empty string values from MXS", () => {
      const filePath = "/path/to/file.czi";
      const initialState = {
        [filePath]: {
          file: filePath,
          "Field A": [],
          "Field B": [],
        },
      };
      const mxsResult = {
        "Field A": { annotation_id: 1, value: "" },
        "Field B": { annotation_id: 2, value: "Valid" },
      };

      const result = reducer(
        getMockStateWithHistory(initialState),
        autofillFromMXS(filePath, mxsResult)
      );

      expect(result.present[filePath]["Field A"]).to.deep.equal([]);
      expect(result.present[filePath]["Field B"]).to.deep.equal(["Valid"]);
      expect(result.present[filePath].autofilledFields).to.deep.equal([
        "Field B",
      ]);
    });

    it("handles boolean values correctly", () => {
      const filePath = "/path/to/file.czi";
      const initialState = {
        [filePath]: {
          file: filePath,
          Timelapse: [],
        },
      };
      const mxsResult = {
        Timelapse: { annotation_id: 50, value: false },
      };

      const result = reducer(
        getMockStateWithHistory(initialState),
        autofillFromMXS(filePath, mxsResult)
      );

      expect(result.present[filePath]["Timelapse"]).to.deep.equal([false]);
      expect(result.present[filePath].autofilledFields).to.deep.equal([
        "Timelapse",
      ]);
    });

    it("handles numeric values correctly", () => {
      const filePath = "/path/to/file.czi";
      const initialState = {
        [filePath]: {
          file: filePath,
          "Image Size X": [],
        },
      };
      const mxsResult = {
        "Image Size X": { annotation_id: 210, value: 1848 },
      };

      const result = reducer(
        getMockStateWithHistory(initialState),
        autofillFromMXS(filePath, mxsResult)
      );

      expect(result.present[filePath]["Image Size X"]).to.deep.equal([1848]);
    });

    it("accumulates autofilled fields on multiple calls", () => {
      const filePath = "/path/to/file.czi";
      const initialState = {
        [filePath]: {
          file: filePath,
          "Field A": [],
          "Field B": [],
          autofilledFields: ["Field A"],
        },
      };
      const mxsResult = {
        "Field B": { annotation_id: 2, value: "Value B" },
      };

      const result = reducer(
        getMockStateWithHistory(initialState),
        autofillFromMXS(filePath, mxsResult)
      );

      expect(result.present[filePath].autofilledFields).to.deep.equal([
        "Field A",
        "Field B",
      ]);
    });

    it("overwrites pre-filled fields since MXS is source of truth", () => {
      const filePath = "/path/to/file.czi";
      const initialState = {
        [filePath]: {
          file: filePath,
          "Favorite Color": ["Red"],
        },
      };
      const mxsResult = {
        "Favorite Color": { annotation_id: 1, value: "Blue" },
      };

      const result = reducer(
        getMockStateWithHistory(initialState),
        autofillFromMXS(filePath, mxsResult)
      );

      expect(result.present).to.deep.equal({
        [filePath]: {
          file: filePath,
          "Favorite Color": ["Blue"],
          autofilledFields: ["Favorite Color"],
        },
      });
    });
  });
});

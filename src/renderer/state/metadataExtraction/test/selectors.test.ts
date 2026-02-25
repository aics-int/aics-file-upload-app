import { expect } from "chai";

import { mockState } from "../../test/mocks";
import { getIsAnyMetadataExtractionLoading } from "../selectors";

describe("metadataExtraction selectors", () => {
  describe("getIsAnyMetadataExtractionLoading", () => {
    it("returns false when no files are in state", () => {
      const result = getIsAnyMetadataExtractionLoading(mockState);
      expect(result).to.be.false;
    });

    it("returns false when no files are loading", () => {
      const result = getIsAnyMetadataExtractionLoading({
        ...mockState,
        metadataExtraction: {
          "/path/to/file1.czi": { loading: false },
          "/path/to/file2.czi": { loading: false },
        },
      });
      expect(result).to.be.false;
    });

    it("returns true when at least one file is loading", () => {
      const result = getIsAnyMetadataExtractionLoading({
        ...mockState,
        metadataExtraction: {
          "/path/to/file1.czi": { loading: false },
          "/path/to/file2.czi": { loading: true },
        },
      });
      expect(result).to.be.true;
    });
  });
});

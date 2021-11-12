import { expect } from "chai";

import JSSResponseMapper from "../jss-response-mapper";
import { UploadJob, UpdateJobRequest } from "../types";

import { mockJSSJob } from "./mocks";

describe("JSSResponseMapper", () => {
  describe("map", () => {
    it("does not modify response if no service fields", () => {
      const result = JSSResponseMapper.map(mockJSSJob);
      expect(result).to.deep.equal(mockJSSJob);
    });
    it("expands service fields", () => {
      const now = new Date();
      const input: UploadJob = {
        ...mockJSSJob,
        serviceFields: {
          files: [
            {
              created: now,
              file: {
                customField: {
                  age: 15,
                },
                originalPath: "/path/to/file",
                filename: "file",
                fileType: "image",
              },
            },
            {
              file: {
                originalPath: "/path/to/file2",
                filename: "file2",
                fileType: "image",
              },
            },
          ],
        },
      };
      const metadata = {
        file: {
          customField: {
            age: 15,
          },
          fileType: "image",
          originalPath: "/path/to/file",
          filename: "file",
        },
        created: now,
      };
      const metadata2 = {
        file: {
          fileType: "image",
          originalPath: "/path/to/file2",
          filename: "file2",
        },
      };
      const expected: UpdateJobRequest = {
        ...mockJSSJob,
        serviceFields: {
          files: [metadata, metadata2],
        },
      };
      const result = JSSResponseMapper.map(input);
      expect(result).to.deep.equals(expected);
    });
    it("converts file extension dummy '(dot)' with '.'", () => {
      const input: UploadJob = {
        ...mockJSSJob,
        serviceFields: {
          files: [],
        },
      };
      const expected: UploadJob = {
        ...mockJSSJob,
        serviceFields: {
          files: [],
        },
      };
      const result = JSSResponseMapper.map(input);
      expect(result).to.deep.equal(expected);
    });
    it("preserves non service fields if service fields provided", () => {
      const currentStage = "copying";
      const input: UploadJob = {
        ...mockJSSJob,
        currentStage,
        serviceFields: {
          files: [],
        },
      };
      const result = JSSResponseMapper.map(input);
      expect(result.currentStage).to.deep.equal(currentStage);
    });
  });
});

import { expect } from "chai";

import JSSResponseMapper from "../jss-response-mapper";
import { JSSJob, JSSUpdateJobRequest } from "../types";

import { mockJSSJob } from "./mocks";

describe("JSSResponseMapper", () => {
  describe("map", () => {
    it("does not modify response if no service fields", () => {
      const result = JSSResponseMapper.map(mockJSSJob);
      expect(result).to.deep.equal(mockJSSJob);
    });
    it("expands service fields", () => {
      const now = new Date();
      const input: JSSJob = {
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
              fileType: "text",
            },
            {
              fileType: "image",
              file: {
                originalPath: "/path/to/file2",
                filename: "file2",
                fileType: "image",
              },
            },
          ],
          type: "upload",
        },
      };
      const metadata = {
        fileType: "text",
        file: {
          customField: {
            age: 15,
          },
          originalPath: "/path/to/file",
          filename: "file",
        },
        created: now,
      };
      const metadata2 = {
        fileType: "image",
        file: {
          originalPath: "/path/to/file2",
          filename: "file2",
        },
      };
      const expected: JSSUpdateJobRequest = {
        ...mockJSSJob,
        serviceFields: {
          files: [metadata, metadata2],
          favorites: {
            boolean: true,
            color: "red",
            fruit: {
              "0": "Apple",
              "2": "Banana",
            },
            number: 9,
            date: now,
            movies: ["Harry Potter", "Insomnia"],
          },
        },
      };
      const result = JSSResponseMapper.map(input);
      expect(result).to.deep.equals(expected);
    });
    it("converts file extension dummy '(dot)' with '.'", () => {
      const input: JSSJob = {
        ...mockJSSJob,
        serviceFields: {
          files: [],
          type: "upload",
        },
      };
      const expected: JSSJob = {
        ...mockJSSJob,
        serviceFields: {
          files: [],
          type: "upload",
        },
      };
      const result = JSSResponseMapper.map(input);
      expect(result).to.deep.equal(expected);
    });
    it("preserves non service fields if service fields provided", () => {
      const currentStage = "copying";
      const input: JSSJob = {
        ...mockJSSJob,
        currentStage,
        serviceFields: {
          files: [],
          type: "upload",
        },
      };
      const result = JSSResponseMapper.map(input);
      expect(result.currentStage).to.deep.equal(currentStage);
    });
  });
});

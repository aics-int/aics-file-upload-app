import { expect } from "chai";

import JSSRequestMapper from "../jss-request-mapper";
import { JSSJobStatus, UpdateJobRequest } from "../types";

describe("JSSRequestMapper", () => {
  describe("map", () => {
    it("does not modify request if no service fields", () => {
      const input: UpdateJobRequest = {
        status: JSSJobStatus.WAITING,
      };
      const result = JSSRequestMapper.map(input);
      expect(result).to.deep.equal(input);
    });
    it("flattens service fields when patch is true", () => {
      const now = new Date();
      const expected = {
        "service_fields.files.0.created": now,
        "service_fields.files.0.file.customField.age": 15,
        "service_fields.files.0.file.example(dot)txt": 32,
        "service_fields.files.0.file.fileType": "text",
        "service_fields.files.0.file.originalPath": "/path/to/file",
        "service_fields.files.0.file.fileName": "file",
        "service_fields.files.1.file.originalPath": "/path/to/file2",
        "service_fields.files.1.file.fileName": "file2",
        "service_fields.files.1.file.fileType": "image",
      };
      const metadata = {
        file: {
          customField: {
            age: 15,
          },
          "example.txt": 32,
          fileType: "text",
          originalPath: "/path/to/file",
          fileName: "file",
        },
        created: now,
      };
      const metadata2 = {
        file: {
          originalPath: "/path/to/file2",
          fileName: "file2",
          fileType: "image",
        },
      };
      const input: UpdateJobRequest = {
        serviceFields: {
          files: [metadata, metadata2],
        },
      };
      const result = JSSRequestMapper.map(input, true);
      expect(result).to.deep.equals(expected);
      expect(result["service_fields"]).to.be.undefined;
    });
    it("preserves non service fields if service fields provided", () => {
      const input: UpdateJobRequest = {
        currentStage: "copying",
        serviceFields: {
          files: [
            {
              file: {
                fileType: "text",
                originalPath: "/path/to/here.txt",
              },
            },
          ],
        },
      };
      const result = JSSRequestMapper.map(input);
      expect(result.currentStage).to.not.be.undefined;
    });
    it("won't flatten past second level of properties by default", () => {
      const files = [
        {
          file: {
            fileType: "image",
            originalPath: "/path/to/somewhere.txt",
          },
        },
      ];
      const input: UpdateJobRequest = {
        serviceFields: {
          files,
        },
      };
      const result = JSSRequestMapper.map(input);
      expect(result["service_fields.files"]).to.equal(files);
    });
  });
});

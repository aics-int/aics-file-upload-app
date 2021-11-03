import { expect } from "chai";

import JSSRequestMapper from "../jss-request-mapper";
import { JSSJobStatus, JSSUpdateJobRequest } from "../types";

describe("JSSRequestMapper", () => {
  describe("map", () => {
    it("does not modify request if no service fields", () => {
      const input: JSSUpdateJobRequest = {
        status: JSSJobStatus.WAITING,
      };
      const result = JSSRequestMapper.map(input);
      expect(result).to.deep.equal(input);
    });
    it("flattens service fields when patch is true", () => {
      const now = new Date();
      const expected = {
        "service_fields.files.0.created": now,
        "service_fields.files.0.fileType": "text",
        "service_fields.files.0.file.customField.age": 15,
        "service_fields.files.0.file.example(dot)txt": 32,
        "service_fields.files.0.file.originalPath": "/path/to/file",
        "service_fields.files.0.file.fileName": "file",
        "service_fields.files.1.fileType": "image",
        "service_fields.files.1.file.originalPath": "/path/to/file2",
        "service_fields.files.1.file.fileName": "file2",
        "service_fields.favorites.boolean": true,
        "service_fields.favorites.color": "red",
        "service_fields.favorites.number": 9,
        "service_fields.favorites.date": now,
        "service_fields.favorites.movies.0": "Harry Potter",
        "service_fields.favorites.movies.1": "Insomnia",
      };
      const metadata = {
        fileType: "text",
        file: {
          customField: {
            age: 15,
          },
          "example.txt": 32,
          originalPath: "/path/to/file",
          fileName: "file",
        },
        created: now,
      };
      const metadata2 = {
        fileType: "image",
        file: {
          originalPath: "/path/to/file2",
          fileName: "file2",
        },
      };
      const input: JSSUpdateJobRequest = {
        serviceFields: {
          files: [metadata, metadata2],
          favorites: {
            boolean: true,
            color: "red",
            number: 9,
            date: now,
            movies: ["Harry Potter", "Insomnia"],
          },
        },
      };
      const result = JSSRequestMapper.map(input, true);
      expect(result).to.deep.equals(expected);
      expect(result["service_fields"]).to.be.undefined;
    });
    it("preserves non service fields if service fields provided", () => {
      const input: JSSUpdateJobRequest = {
        currentStage: "copying",
        serviceFields: {
          foo: "bar",
        },
      };
      const result = JSSRequestMapper.map(input);
      expect(result.currentStage).to.not.be.undefined;
    });
    it("won't flatten past second level of properties by default", () => {
      const data = [{ id: 1 }, { id: 2 }];
      const input: JSSUpdateJobRequest = {
        serviceFields: {
          data,
        },
      };
      const result = JSSRequestMapper.map(input);
      expect(result["service_fields.data"]).to.equal(data);
    });
  });
});

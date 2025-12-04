import { expect } from "chai";
import {
  createStubInstance,
  stub,
  restore,
  match,
  SinonStubbedInstance,
} from "sinon";

import MetadataExtractionService, { MXSResult } from "..";
import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { LocalStorage } from "../../../types";
import HttpCacheClient from "../../http-cache-client";

describe("MetadataExtractionService", () => {
  let mxsClient: MetadataExtractionService;
  let httpClient: SinonStubbedInstance<HttpCacheClient>;
  let storage: SinonStubbedInstance<EnvironmentAwareStorage>;

  beforeEach(() => {
    httpClient = createStubInstance(HttpCacheClient);
    storage = createStubInstance(EnvironmentAwareStorage);
    // Stub `get` specifically, since it is a class property and not on the prototype
    storage.get = stub() as any;

    mxsClient = new MetadataExtractionService(
      httpClient as any as HttpCacheClient,
      storage as any as LocalStorage
    );
  });

  afterEach(() => {
    restore();
  });

  describe("fetchExtractedMetadata", () => {
    it("makes request for a normal file", async () => {
      const path = "/some/path/to/file.tif";

      const mxsResult: MXSResult = {
        AnnotationA: {
          annotation_id: 1,
          value: "foo",
        },
        AnnotationB: {
          annotation_id: 2,
          value: 42,
        },
      };

      httpClient.put.resolves(mxsResult as any);

      const result = await mxsClient.fetchExtractedMetadata(path);

      expect(result).to.equal(mxsResult);
      expect(httpClient.put).to.have.been.calledOnceWith(
        "/metadata-extraction-service/extracted-annotations",
        { path },
        match({
          headers: {
            "Content-Type": "application/json",
          },
        })
      );
    });
  });
});

import { expect } from "chai";
import {
  createStubInstance,
  stub,
  restore,
  match,
  SinonStubbedInstance,
} from "sinon";

import MetadataManagementService from "..";
import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { LocalStorage } from "../../../types";
import HttpCacheClient from "../../http-cache-client";

describe("MetadataManagementService", () => {
  let mmsClient: MetadataManagementService;
  let httpClient: SinonStubbedInstance<HttpCacheClient>;
  let storage: SinonStubbedInstance<EnvironmentAwareStorage>;

  beforeEach(() => {
    httpClient = createStubInstance(HttpCacheClient);
    storage = createStubInstance(EnvironmentAwareStorage);
    // Stub `get` specifically, since it is a class property and not on the prototype
    storage.get = stub();

    mmsClient = new MetadataManagementService(
      (httpClient as any) as HttpCacheClient,
      (storage as any) as LocalStorage
    );
  });

  afterEach(() => {
    restore();
  });

  describe("getPlate", () => {
    it("makes request for a normal barcode", async () => {
      httpClient.get.resolves({
        data: {
          data: [
            {
              plate: {},
              wells: [],
            },
          ],
        },
      });

      const result = await mmsClient.getPlate("12345");
      expect(result.plate).to.exist;
      expect(result.wells).to.exist;
      expect(httpClient.get).to.have.been.calledOnceWith(
        match("/metadata-management-service/1.0/plate/query?barcode=12345")
      );
    });

    it("makes request for a barcode with special character", async () => {
      httpClient.get.resolves({
        data: {
          data: [
            {
              plate: {},
              wells: [],
            },
          ],
        },
      });

      const result = await mmsClient.getPlate("12345+1");
      expect(result.plate).to.exist;
      expect(result.wells).to.exist;
      expect(httpClient.get).to.have.been.calledOnceWith(
        match("/metadata-management-service/1.0/plate/query?barcode=12345%2B1")
      );
    });
  });
});

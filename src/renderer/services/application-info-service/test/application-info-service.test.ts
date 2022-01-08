import { expect } from "chai";
import { createStubInstance, stub, SinonStubbedInstance } from "sinon";

import ApplicationInfoService from "..";
import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { LocalStorage } from "../../../types";
import HttpCacheClient from "../../http-cache-client";

describe("ApplicationInfoService", () => {
  let applicationInfoService: ApplicationInfoService;
  let httpClient: SinonStubbedInstance<HttpCacheClient>;
  let storage: SinonStubbedInstance<EnvironmentAwareStorage>;

  beforeEach(() => {
    httpClient = createStubInstance(HttpCacheClient);
    storage = createStubInstance(EnvironmentAwareStorage);
    // Stub `get` specifically, since it is a class property and not on the prototype
    storage.get = stub();

    applicationInfoService = new ApplicationInfoService(
      httpClient as any as HttpCacheClient,
      storage as any as LocalStorage,
      false
    );
  });

  describe("getNewestApplicationVersion", () => {
    it("returns newest version found", async () => {
      const newestVersion = "v2.3.1";
      httpClient.get.resolves({
        data: ["v1.6.2", newestVersion, "v2.0.0", "v0.9.9", "v1.8.0"].map(
          (name) => ({ name })
        ),
      });

      const result = await applicationInfoService.getNewestApplicationVersion();
      expect(result).to.equal(newestVersion);
    });

    it("throws error if no versions found", () => {
      httpClient.get.resolves({
        data: [],
      });

      return expect(
        applicationInfoService.getNewestApplicationVersion()
      ).to.be.rejectedWith(
        "Unexpected return format from GitHub while trying to determine newest app version"
      );
    });

    it("throws error if name not specified in response data", () => {
      httpClient.get.resolves({
        data: ["v2.3.2", "v2.0.0", "v0.9.9", "v1.8.0"].map((badKeyName) => ({
          badKeyName,
        })),
      });

      return expect(
        applicationInfoService.getNewestApplicationVersion()
      ).to.be.rejectedWith(
        "Unexpected return format from GitHub while trying to determine newest app version"
      );
    });
  });
});

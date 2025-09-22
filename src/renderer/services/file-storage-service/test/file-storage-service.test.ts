import { expect } from "chai";
import { createSandbox, SinonStub, SinonStubbedInstance } from "sinon";

import FileStorageService, { UploadStatus } from "..";
import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { FileType } from "../../../util";
import HttpCacheClient from "../../http-cache-client";

describe("FileStorageService", () => {
  const sandbox = createSandbox();
  let httpClient: SinonStubbedInstance<HttpCacheClient>;
  let storage: SinonStubbedInstance<EnvironmentAwareStorage>;
  let fss: FileStorageService;

  beforeEach(() => {
    httpClient = sandbox.createStubInstance(HttpCacheClient);
    storage = sandbox.createStubInstance(EnvironmentAwareStorage);
    fss = new FileStorageService(
      httpClient,
      storage
    );

    // Stub `get` specifically, since it is a class property and not on the prototype
    storage.get = sandbox.stub() as any;
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("upload", () => {
    it("check to see if we send correctly formatted post body", async () => {
      const expectedResponse = { uploadId: "12930132", status: UploadStatus.WORKING, fileId: "abc123" };
      const response = { status: 200, data: expectedResponse };
      const postStub = sandbox.stub().resolves(response);
      sandbox.replace(httpClient, "post", postStub as SinonStub<any>);

      const fileName = "my_cool_czi.czi";
      const fileType = FileType.IMAGE;
      const sourcePath = "/allen/aics/test/my_cool_czi.czi";

      const actual = await fss.upload(fileName, fileType, sourcePath, "VAST");

      expect(actual).to.deep.equal(expectedResponse);
      const actualPostBody = postStub.firstCall.args[1];
      expect(actualPostBody).to.include({ fileName, fileType });
    });
  });
});
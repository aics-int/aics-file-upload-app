import { expect } from "chai";
import { createSandbox, SinonStub } from "sinon";

import FileStorageService from "..";
import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { LocalStorage } from "../../../types";
import HttpCacheClient from "../../http-cache-client";

describe("FileStorageService", () => {
  const sandbox = createSandbox();
  const storage = sandbox.createStubInstance(EnvironmentAwareStorage);
  const httpClient = sandbox.createStubInstance(HttpCacheClient);
  // Stub `get` specifically, since it is a class property and not on the prototype
  storage.get = sandbox.stub();

  const fss = new FileStorageService(
    (httpClient as any) as HttpCacheClient,
    (storage as any) as LocalStorage
  );

  afterEach(() => {
    sandbox.resetHistory();
  });

  after(() => {
    sandbox.restore();
  });

  describe("registerUpload", () => {
    it("sends correctly formatted post body", async () => {
      // Arrange
      const expectedResponse = {
        uploadId: "12930132",
        chunkSize: 14,
      };
      const response = {
        status: 200,
        data: expectedResponse,
      };
      const postStub = sandbox.stub().resolves(response);
      const fileName = "my_cool_czi.czi";
      const fileSize = 13941234;
      const md5 = "13249012341234";
      const expectedPostBody = {
        // eslint-disable-next-line @typescript-eslint/camelcase
        file_name: fileName,
        // eslint-disable-next-line @typescript-eslint/camelcase
        file_size: fileSize,
        MD5: md5,
      };
      sandbox.replace(httpClient, "post", postStub as SinonStub<any>);

      // Act
      const actual = await fss.registerUpload(fileName, fileSize, md5);

      // Assert
      expect(actual).to.deep.equal(expectedResponse);
      const actualPostBody = postStub.firstCall.args[1];
      expect(actualPostBody).to.deep.equal(expectedPostBody);
    });
  });

  describe("sendUploadChunk", () => {
    it("creates the correct range header for the chunk", async () => {
      // Arrange
      const uploadId = "132390123";
      const chunkSize = 132413;
      const chunkNumber = 9;
      const postBody = new Uint8Array();
      const rangeStart = (chunkNumber - 1) * chunkSize;
      const expectedRange = `bytes=${rangeStart}-${rangeStart - 1}`;
      const expectedResponse = {
        uploadId,
        chunkNumber: chunkNumber + 1,
      };
      const response = {
        status: 200,
        data: expectedResponse,
      };
      httpClient.post.resolves(response);

      // Act
      const actual = await fss.sendUploadChunk(
        uploadId,
        chunkNumber,
        rangeStart,
        postBody
      );

      // Assert
      expect(actual).to.deep.equal(expectedResponse);
      const actualRange = httpClient.post.firstCall.args[2]?.headers?.range;
      expect(actualRange).to.deep.equal(expectedRange);
    });
  });
});

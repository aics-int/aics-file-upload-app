import { expect } from "chai";
import sinon, { createStubInstance } from "sinon";

import FileStorageService from "..";
import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { LocalStorage } from "../../../types";
import HttpCacheClient from "../../http-cache-client";

describe("FileStorageService", () => {
  const storage = createStubInstance(EnvironmentAwareStorage);
  const httpClient = createStubInstance(HttpCacheClient);

  const fss = new FileStorageService(
    (httpClient as any) as HttpCacheClient,
    (storage as any) as LocalStorage
  );

  afterEach(() => {
    sinon.resetHistory();
  });

  after(() => {
    sinon.restore();
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
        data: [expectedResponse],
      };
      const postStub = sinon.stub().resolves(response);
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
      sinon.replace(httpClient, "post", postStub);

      // Act
      const actual = await fss.registerUpload(fileName, fileSize, md5);

      // Assert
      expect(actual).to.deep.equal(expectedResponse);
      const actualPostBody = postStub.firstCall.args[1];
      expect(actualPostBody).to.equal(expectedPostBody);
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
        data: [expectedResponse],
      };
      const postStub = sinon.stub().resolves(response);
      sinon.replace(httpClient, "post", postStub);

      // Act
      const actual = await fss.sendUploadChunk(
        uploadId,
        chunkSize,
        chunkNumber,
        postBody
      );

      // Assert
      expect(actual).to.deep.equal(expectedResponse);
      const actualRange = postStub.firstCall.args[2]?.headers?.range;
      expect(actualRange).to.equal(expectedRange);
    });
  });
});

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
      const fileType = FileType.IMAGE;
      const fileSize = 13941234;
      const expectedPostBody = {
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        local_nas_path: undefined,
        local_nas_shortcut: false,
        multifile: false,
        should_be_in_local: undefined
      };
      sandbox.replace(httpClient, "post", postStub as SinonStub<any>);

      // Act
      const actual = await fss.registerUpload(fileName, fileType, fileSize);

      // Assert
      expect(actual).to.deep.equal(expectedResponse);
      const actualPostBody = postStub.firstCall.args[1];
      expect(actualPostBody).to.deep.equal(expectedPostBody);
    });
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
      const localNasPath = '/test/nas/path';
      const postStub = sandbox.stub().resolves(response);
      const fileName = "my_cool_czi.czi";
      const fileType = FileType.IMAGE;
      const fileSize = 13941234;
      const expectedPostBody = {
        file_name: fileName,
        file_type: fileType,
        file_size: fileSize,
        local_nas_path: localNasPath,
        local_nas_shortcut: true,
        multifile: false,
        should_be_in_local: undefined
      };
      sandbox.replace(httpClient, "post", postStub as SinonStub<any>);

      // Act
      const actual = await fss.registerUpload(fileName, fileType, fileSize, localNasPath);

      // Assert
      expect(actual).to.deep.equal(expectedResponse);
      const actualPostBody = postStub.firstCall.args[1];
      expect(actualPostBody).to.deep.equal(expectedPostBody);
    });
  });

  describe("sendUploadChunk", () => {
    class AxiosError extends Error {
      public response: any;

      constructor(response: any) {
        super("test error");
        this.response = response;
      }
    }

    it("retries chunk when error occurs and server status indicates RETRY", async () => {
      // Arrange
      const chunkNumber = 2;
      httpClient.get.resolves({
        data: {
          chunkStatuses: [UploadStatus.COMPLETE, UploadStatus.RETRY],
          status: UploadStatus.WORKING,
          uploadId: "anyId",
          chunkSize: 2,
        }
      })
      httpClient.post.onFirstCall().rejects(new AxiosError({status: 400}));
      httpClient.post.onSecondCall().resolves({
        status: 200,
        data: {
          uploadId: "anyId",
          chunkNumber: 0,
        },
      });

      // Act
      await fss.sendUploadChunk(
        "9021312",
        chunkNumber,
        1,
        "anyMd5",
        new Uint8Array(),
        "testUser"
      );

      // Assert
      expect(httpClient.post.callCount).to.equal(2);
    });

    it("creates the correct range header for the chunk", async () => {
      // Arrange
      const uploadId = "132390123";
      const chunkSize = 132413;
      const chunkNumber = 9;
      const postBody = new Uint8Array();
      const rangeStart = (chunkNumber - 1) * chunkSize;
      const expectedRange = `bytes=${rangeStart}-${rangeStart - 1}`;
      httpClient.post.resolves({
        status: 200,
        data: {
          uploadId,
          chunkNumber: chunkNumber + 1,
        },
      });

      // Act
      await fss.sendUploadChunk(
        uploadId,
        chunkNumber,
        rangeStart,
        "anyMd5",
        postBody,
        "testUser"
      );

      // Assert
      const actualRange = httpClient.post.firstCall.args[2]?.headers?.Range;
      expect(actualRange).to.deep.equal(expectedRange);
    });
  });
});

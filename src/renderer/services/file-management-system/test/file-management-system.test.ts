import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { basename } from "path";

import { expect } from "chai";
import { createSandbox, SinonStubbedInstance } from "sinon";

import FileManagementSystem from "..";
import {
  FileStorageService,
  JobStatusService,
  MetadataManagementService,
} from "../..";
import { mockJob, mockSuccessfulUploadJob } from "../../../state/test/mocks";
import { UploadStatus } from "../../file-storage-service";
import { JSSJobStatus, UploadJob } from "../../job-status-service/types";

describe("FileManagementSystem", () => {
  const sandbox = createSandbox();
  let fss: SinonStubbedInstance<FileStorageService>;
  let jss: SinonStubbedInstance<JobStatusService>;
  let mms: SinonStubbedInstance<MetadataManagementService>;
  let fms: FileManagementSystem;
  const testFilePath = path.resolve(os.tmpdir(), "md5-test.txt");
  const testFileSize = 1024 * 1024 * 2; //2MB

  before(async () => {
    // Generate file with testFileSize of "random" bytes
    await fs.promises.writeFile(testFilePath, Buffer.allocUnsafe(testFileSize));
  });

  beforeEach(() => {
    fss = sandbox.createStubInstance(FileStorageService);
    jss = sandbox.createStubInstance(JobStatusService);
    mms = sandbox.createStubInstance(MetadataManagementService);

    fms = new FileManagementSystem({
      fss: fss as any,
      jss: jss as any,
      mms: mms as any,
    });
  });

  afterEach(() => {
    sandbox.restore();
  });

  after(async () => {
    await fs.promises.unlink(testFilePath);
  });

  describe("startUpload", () => {
    const metadata = {
      file: { originalPath: testFilePath, fileType: "text" },
    };
    const serviceFields = { groupId: "group", multifile: false };

    beforeEach(() => {
      fss.upload.resolves({
        status: UploadStatus.WORKING,
        uploadId: "mockUploadId",
        fileId: "mockFileId",
      });
    });

    it("sends the upload request to FSS with the upload", async () => {
      await fms.startUpload(metadata, serviceFields);

      expect(fss.upload.getCall(0).args[6]).to.deep.equal({
        files: [metadata],
        type: "upload",
        localNasShortcut: false,
        groupId: "group",
        multifile: false,
      });
    });

    it("Uses extracted fileName in FSS upload", async () => {
      await fms.startUpload(metadata, serviceFields);

      const actualFileName = fss.upload.getCall(0).args[0];
      expect(actualFileName).to.equal(basename(testFilePath));
    });

    it("Uses customFileName in FSS upload", async () => {
      await fms.startUpload(
        { file: { ...metadata.file, customFileName: "bla" } },
        serviceFields
      );

      const actualFileName = fss.upload.getCall(0).args[0];
      expect(actualFileName).to.equal("bla");
    });
  });

  describe("complete", () => {
    const storedUpload: UploadJob = {
      ...mockJob,
      status: JSSJobStatus.SUCCEEDED,
      serviceFields: {
        fileId: "mockFileId",
        uploadRequest: {
          files: [{ file: { fileType: "text", originalPath: testFilePath } }],
          type: "upload",
        },
      },
    };

    it("writes metadata to MMS and records the result on the job", async () => {
      // Arrange
      fss.getFileAttributes.resolves({
        fileId: "mockFileId",
        name: "file.txt",
        size: 1,
        localPath: "/allen/file.txt",
        md5: "md5",
      });

      // Act
      await fms.complete(storedUpload);

      // Assert
      expect(mms.createFileMetadata).to.have.been.calledOnce;
      expect(jss.updateJob).to.have.been.calledOnceWith(storedUpload.id, {
        serviceFields: {
          uploadRequest: {
            metadataWritten: true,
            error: null,
            result: [
              {
                fileId: "mockFileId",
                fileName: "file.txt",
                readPath: "/allen/file.txt",
              },
            ],
          },
        },
      });
    });

    it("records the failure on the job if writing metadata fails", async () => {
      // Arrange
      mms.createFileMetadata.rejects(new Error("Test failure"));

      // Act
      await expect(fms.complete(storedUpload)).to.be.rejectedWith(Error);

      // Assert
      expect(jss.updateJob).to.have.been.calledOnce;
      const { uploadRequest } =
        jss.updateJob.getCall(0).args[1].serviceFields || {};
      expect(uploadRequest?.metadataWritten).to.be.false;
      expect(uploadRequest?.error).to.contain("Test failure");
    });
  });

  describe("retry", () => {
    const mockUploadId = "mockUploadId";

    it("only rewrites metadata if the storage service already has the file", async () => {
      // Arrange
      jss.getJob.resolves({
        ...mockJob,
        status: JSSJobStatus.SUCCEEDED,
        serviceFields: {
          fileId: "mockFileId",
          uploadRequest: {
            files: [{ file: { fileType: "text", originalPath: testFilePath } }],
            type: "upload",
            metadataWritten: false,
          },
        },
      });
      fss.getFileAttributes.resolves({
        fileId: "mockFileId",
        name: "file.txt",
        size: 1,
        localPath: "/allen/file.txt",
        md5: "md5",
      });

      // Act
      await fms.retry(mockUploadId);

      // Assert
      expect(mms.createFileMetadata).to.have.been.calledOnce;
      expect(fss.retryUpload).to.not.have.been.called;
    });

    it("retries the upload in FSS and clears the previous error", async () => {
      // Arrange
      jss.getJob.resolves({ ...mockJob, status: JSSJobStatus.FAILED });

      // Act
      await fms.retry(mockUploadId);

      // Assert
      expect(fss.retryUpload).to.have.been.calledOnceWith(mockUploadId);
      expect(jss.updateJob).to.have.been.calledOnceWith(mockUploadId, {
        serviceFields: { uploadRequest: { error: null, cancelled: false } },
      });
    });

    it("rejects retrying a successful upload", async () => {
      // Arrange
      jss.getJob.resolves(mockSuccessfulUploadJob);

      // Act / Assert
      await expect(fms.retry(mockUploadId)).to.be.rejectedWith(Error);
      expect(fss.retryUpload).to.not.have.been.called;
    });
  });

  describe("cancel", () => {
    const mockUploadId = "90k123123";

    it("cancels the upload in FSS and marks the job as cancelled", async () => {
      // Arrange
      jss.getJob.resolves({ ...mockJob, status: JSSJobStatus.WORKING });

      // Act
      await fms.cancel(mockUploadId);

      // Assert
      expect(fss.cancelUpload).to.have.been.calledOnceWith(mockUploadId);
      expect(
        jss.updateJob.calledOnceWithExactly(mockUploadId, {
          status: JSSJobStatus.FAILED,
          error: "Cancelled by user",
          serviceFields: { uploadRequest: { cancelled: true } },
        })
      ).to.be.true;
    });

    it("rejects cancellation if upload not in progress", async () => {
      // Arrange
      jss.getJob.resolves({
        ...mockJob,
        status: JSSJobStatus.SUCCEEDED,
      });

      // Act / Assert
      await expect(fms.cancel(mockUploadId)).rejectedWith(Error);
      expect(fss.cancelUpload).to.not.have.been.called;
    });
  });

  describe("Path normalization, convert to posix.", () => {
    it("converts Windows path to posix.", async () => {
      expect(fms.posixPath("//Allen/aics/foo/test.czi")).to.equal(
        "/allen/aics/foo/test.czi"
      );
      expect(fms.posixPath("/Allen/aics/foo/test.czi")).to.equal(
        "/allen/aics/foo/test.czi"
      );
      expect(fms.posixPath("/ALLEN/aics/foo/test.czi")).to.equal(
        "/allen/aics/foo/test.czi"
      );
      expect(fms.posixPath("/allen/aics/foo/test.czi")).to.equal(
        "/allen/aics/foo/test.czi"
      );
    });

    it("Evaluates true when asked if Isilon path should be a localNasShortcut upload.", async () => {
      expect(
        fms.shouldBeLocalNasUpload(
          "//allen/aics/assay-dev/MicroscopyData/Sara/2023/20230420/ZSD2notes.txt"
        )
      ).to.be.true;
    });
  });
});

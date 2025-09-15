import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import { createSandbox, SinonStubbedInstance } from "sinon";

import FileManagementSystem from "..";
import {
  FileStorageService,
  JobStatusService,
  MetadataManagementService,
} from "../..";
import { mockJob, mockWorkingUploadJob } from "../../../state/test/mocks";
import { UploadStatus } from "../../file-storage-service";
import {
  JSSJobStatus,
  UploadJob,
} from "../../job-status-service/types";

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
    await fs.promises.writeFile(
      testFilePath,
      Buffer.allocUnsafe(testFileSize)
    );
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

  describe("initiateUpload", () => {
    it("creates tracking job in JSS", async () => {
      // Act
      await fms.initiateUpload(
        { file: { originalPath: "", fileType: "txt" } },
        "test"
      );

      // Assert
      expect(jss.createJob).to.have.been.calledOnce;
    });
  });

  describe("upload", () => {
    it("stores FSS uploadId in JSS after starting upload", async () => {
      const upload: UploadJob = {
        ...mockJob,
        serviceFields: {
          files: [{ file: { fileType: "text", originalPath: testFilePath } }],
          type: "upload",
        },
      };

      fss.upload.resolves({
        status: UploadStatus.WORKING,
        uploadId: "mockUploadId",
        fileId: "mockFileId",
      });

      await fms.upload(upload);

      expect(fss.upload.calledOnce).to.be.true;
      expect(jss.updateJob.calledWith(upload.jobId, {
        serviceFields: { fssUploadId: "mockUploadId" },
      })).to.be.true;
    });

    it("calls retryFinalize on a localNasShortcut upload", async () => {
      // Arrange
      const { mtime: fileLastModified } =
        await fs.promises.stat(testFilePath);
      const fileLastModifiedInMs = fileLastModified.getTime();
      const fssUploadId = "234124141";
      const fuaUploadJob: UploadJob = {
        ...mockJob,
        serviceFields: {
          files: [
            {
              file: {
                fileType: "text",
                originalPath: testFilePath,
              },
            },
          ],
          localNasShortcut: true,
          fssUploadId,
          type: "upload",
          lastModifiedInMS: fileLastModifiedInMs,
        },
      };
      jss.getJob.onFirstCall().resolves(fuaUploadJob);
      fss.getStatus.onFirstCall().resolves({
        uploadId: fssUploadId,
        fileId: "mockFileId",
        status: UploadStatus.RETRY,
      }).onSecondCall().resolves({
        uploadId: fssUploadId,
        fileId: "mockFileId",
        status: UploadStatus.COMPLETE,
      });

      // Act
      await fms.retry(fssUploadId);

      // Assert
      expect(jss.createJob.called).to.be.false;
    });
  });


  describe("complete", () => {
    it("fails upload job on error", async () => {
      // Arrange
      mms.createFileMetadata.rejects(new Error("Test failure"));

      // Act
      await expect(
        fms.complete(mockWorkingUploadJob, "90124124")
      ).to.be.rejectedWith(Error);

      // Assert
      expect(jss.updateJob).to.have.been.calledOnce;
    });
  });

  describe("cancel", () => {
    const mockUploadId = "90k123123";

    it("cancels upload via reader and FSS", async () => {
      // Arrange
      jss.getJob.resolves({
        ...mockJob,
        status: JSSJobStatus.WORKING,
        serviceFields: {
          ...mockJob.serviceFields,
          fssUploadId: "12412m4413",
        },
      });

      // still in progress
      fss.getStatus.resolves({
        uploadId: "12412m4413",
        status: UploadStatus.WORKING,
        fileId: "mockFileId",
      });

      // Act
      await fms.cancel(mockUploadId);

      // Assert
      expect(fss.cancelUpload).to.have.been.calledOnceWith("12412m4413");
    });

    it("sets job status to FAILED with cancellation flag", async () => {
      // Arrange
      jss.getJob.resolves(mockJob);

      // Act
      await fms.cancel(mockUploadId);

      // Assert
      expect(
        jss.updateJob.calledOnceWithExactly(mockUploadId, {
          status: JSSJobStatus.FAILED,
          serviceFields: {
            cancelled: true,
            error: "Cancelled by user",
          },
        })
      ).to.be.true;
    });

    it("rejects cancellations of uploads that have been successfully copied into the FMS", async () => {
      // Arrange
      jss.getJob.resolves({
        ...mockJob,
        status: JSSJobStatus.WORKING,
        serviceFields: {
          ...mockJob.serviceFields,
          fssUploadId: "12412m4413",
        },
      });
      fss.getStatus.resolves({
        uploadId: "-1",
        status: UploadStatus.COMPLETE,
        fileId: "mockFileId",
      });

      // Act / Assert
      await expect(fms.cancel(mockUploadId)).rejectedWith(Error);
    });

    it("rejects cancellation if upload not in progress", async () => {
      // Arrange
      jss.getJob.resolves({
        ...mockJob,
        status: JSSJobStatus.SUCCEEDED,
      });

      // Act / Arrange
      await expect(fms.cancel(mockUploadId)).rejectedWith(Error);
    });
  });

  describe("Path normalization, convert to posix.", () => {
    it("converts Windows path to posix.",async () => {
      expect(fms.posixPath("//Allen/aics/foo/test.czi")).to.equal("/allen/aics/foo/test.czi");
      expect(fms.posixPath("/Allen/aics/foo/test.czi")).to.equal("/allen/aics/foo/test.czi");
      expect(fms.posixPath("/ALLEN/aics/foo/test.czi")).to.equal("/allen/aics/foo/test.czi");
      expect(fms.posixPath("/allen/aics/foo/test.czi")).to.equal("/allen/aics/foo/test.czi");
    });

    it("Evaluates true when asked if Isilon path should be a localNasShortcut upload.", async () => {
      expect(fms.shouldBeLocalNasUpload("//allen/aics/assay-dev/MicroscopyData/Sara/2023/20230420/ZSD2notes.txt")).to.be.true;
    });

  });
});

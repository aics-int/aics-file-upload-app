import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import { noop } from "lodash";
import { createSandbox } from "sinon";

import FileManagementSystem from "..";
import {
  FileStorageService,
  JobStatusService,
  LabkeyClient,
  MetadataManagementService,
} from "../..";
import { mockJob } from "../../../state/test/mocks";
import { UploadStatus } from "../../file-storage-service";
import { JSSJobStatus, UploadJob } from "../../job-status-service/types";
import ChunkedFileReader from "../ChunkedFileReader";

describe("FileManagementSystem", () => {
  const sandbox = createSandbox();
  const fileReader = sandbox.createStubInstance(ChunkedFileReader);
  const fss = sandbox.createStubInstance(FileStorageService);
  const jss = sandbox.createStubInstance(JobStatusService);
  const lk = sandbox.createStubInstance(LabkeyClient);
  const mms = sandbox.createStubInstance(MetadataManagementService);

  const fms = new FileManagementSystem({
    fileReader: fileReader as any,
    fss: fss as any,
    jss: jss as any,
    lk: lk as any,
    mms: mms as any,
  });
  const testFilePath = path.resolve(os.tmpdir(), "md5-test.txt");

  beforeEach(async () => {
    // Generate file with 2MB of "random" bytes
    await fs.promises.writeFile(
      testFilePath,
      Buffer.allocUnsafe(1024 * 1024 * 2)
    );
  });

  afterEach(async () => {
    sandbox.resetHistory();
    await fs.promises.unlink(testFilePath);
  });

  after(() => {
    sandbox.restore();
  });

  describe("initiateUpload", () => {
    it("creates tracking job in JSS", async () => {
      // Act
      await fms.initiateUpload(
        { file: { originalPath: "", fileType: "txt" } },
        "test"
      );

      // Assert
      expect(jss.createJob.calledOnce).to.be.true;
    });
  });

  describe("upload", () => {
    it("creates appropriate metadata & completes tracking job", async () => {
      // Arrange
      const md5 = "09k2341234k";
      const upload: UploadJob = {
        ...mockJob,
        serviceFields: {
          type: "upload",
          files: [
            {
              file: {
                fileType: "text",
                originalPath: testFilePath,
              },
            },
          ],
        },
      };
      const fileId = "12343124";
      const localPath = "/some/path/into/fms/at/test_file.txt";
      fileReader.calculateMD5.resolves(md5);
      lk.fileExistsByNameAndMD5.resolves(false);
      fss.registerUpload.resolves({ uploadId: "091234124", chunkSize: 2424 });
      fss.repeatFinalize.resolves({
        fileId,
        chunkNumber: 14,
        uploadId: upload.jobId,
      });
      fss.getFileAttributes.resolves({
        fileId,
        localPath,
        addedToLabkey: true,
        fileName: "",
        fileSize: 4,
        md5: "",
      });

      // Act
      await fms.upload(upload, noop);

      // Assert
      expect(fileReader.calculateMD5.calledOnce).to.be.true;
      expect(
        lk.fileExistsByNameAndMD5.calledOnceWithExactly(
          path.basename(testFilePath),
          md5
        )
      ).to.be.true;
      expect(
        mms.createFileMetadata.calledOnceWithExactly(
          fileId,
          upload.serviceFields.files[0]
        )
      ).to.be.true;
      expect(
        jss.updateJob.calledWithExactly(upload.jobId, {
          status: JSSJobStatus.SUCCEEDED,
          serviceFields: {
            result: [
              {
                fileId,
                fileName: path.basename(localPath),
                readPath: localPath,
              },
            ],
          },
        })
      ).to.be.true;
    });

    it("re-uses MD5 if not modified since last attempt", async () => {
      // Arrange
      const { mtime: lastModified } = await fs.promises.stat(testFilePath);
      const upload: UploadJob = {
        ...mockJob,
        serviceFields: {
          type: "upload",
          files: [
            {
              file: {
                fileType: "text",
                originalPath: testFilePath,
              },
            },
          ],
          lastModifiedInMS: lastModified.getMilliseconds(),
          calculatedMD5: "123094123412",
        },
      };
      const fileId = "12343124";
      const localPath = "/some/path/into/fms/at/test_file.txt";
      lk.fileExistsByNameAndMD5.resolves(false);
      fss.registerUpload.resolves({ uploadId: "091234124", chunkSize: 2424 });
      fss.repeatFinalize.resolves({
        fileId,
        chunkNumber: 14,
        uploadId: upload.jobId,
      });
      fss.getFileAttributes.resolves({
        fileId,
        localPath,
        addedToLabkey: true,
        fileName: "",
        fileSize: 4,
        md5: "",
      });

      // Act
      await fms.upload(upload, noop);

      // Assert
      expect(fileReader.calculateMD5.called).to.be.false;
    });

    it("fails upload if error occurs during finalize", async () => {
      // Arrange
      const error = "Test failure during finalize";
      const md5 = "09k2341234k";
      const upload: UploadJob = {
        ...mockJob,
        serviceFields: {
          type: "upload",
          files: [
            {
              file: {
                fileType: "text",
                originalPath: testFilePath,
              },
            },
          ],
        },
      };
      fileReader.calculateMD5.resolves(md5);
      lk.fileExistsByNameAndMD5.resolves(false);
      fss.registerUpload.resolves({ uploadId: "091234124", chunkSize: 2424 });
      fss.repeatFinalize.rejects(new Error(error));

      // Act
      await expect(fms.upload(upload, noop)).to.be.rejectedWith(Error);

      // Assert
      expect(fileReader.calculateMD5.calledOnce).to.be.true;
      expect(
        lk.fileExistsByNameAndMD5.calledOnceWithExactly(
          path.basename(testFilePath),
          md5
        )
      ).to.be.true;
      expect(mms.createFileMetadata.called).to.be.false;
      expect(
        jss.updateJob.calledWithExactly(upload.jobId, {
          status: JSSJobStatus.FAILED,
          serviceFields: {
            error: `Something went wrong uploading ${upload.jobName}. Details: ${error}`,
          },
        })
      ).to.be.true;
    });
  });

  describe("retry", () => {
    it("creates new upload if fss upload not tracked", async () => {
      // Arrange
      const upload: UploadJob = {
        ...mockJob,
        serviceFields: {
          type: "upload",
          files: [
            {
              file: {
                fileType: "text",
                originalPath: testFilePath,
              },
            },
          ],
        },
      };
      const fileId = "12343124";
      const localPath = "/some/path/into/fms/at/test_file.txt";
      jss.getJob.resolves(upload);
      jss.createJob.resolves(upload);
      fileReader.calculateMD5.resolves("09k2341234k");
      lk.fileExistsByNameAndMD5.resolves(false);
      fss.registerUpload.resolves({ uploadId: "091234124", chunkSize: 2424 });
      fss.repeatFinalize.resolves({
        fileId,
        chunkNumber: 14,
        uploadId: upload.jobId,
      });
      fss.getFileAttributes.resolves({
        fileId,
        localPath,
        addedToLabkey: true,
        fileName: "",
        fileSize: 4,
        md5: "",
      });

      // Act
      await fms.retry("mockUploadId", noop);

      // Assert
      expect(fss.getStatus.called).to.be.false;
      expect(jss.createJob.calledOnce).to.be.true;
    });

    it("creates new upload if fss upload not in progress (able to resume)", async () => {
      // Arrange
      const upload: UploadJob = {
        ...mockJob,
        serviceFields: {
          type: "upload",
          files: [
            {
              file: {
                fileType: "text",
                originalPath: testFilePath,
              },
            },
          ],
          fssUploadId: "234124141",
        },
      };
      const fileId = "12343124";
      const localPath = "/some/path/into/fms/at/test_file.txt";
      jss.getJob.resolves(upload);
      jss.createJob.resolves(upload);
      fss.getStatus.resolves({
        uploadStatus: UploadStatus.FAILED,
        chunkStatuses: [],
      });
      fileReader.calculateMD5.resolves("09k2341234k");
      lk.fileExistsByNameAndMD5.resolves(false);
      fss.registerUpload.resolves({ uploadId: "091234124", chunkSize: 2424 });
      fss.repeatFinalize.resolves({
        fileId,
        chunkNumber: 14,
        uploadId: upload.jobId,
      });
      fss.getFileAttributes.resolves({
        fileId,
        localPath,
        addedToLabkey: true,
        fileName: "",
        fileSize: 4,
        md5: "",
      });

      // Act
      await fms.retry("mockUploadId", noop);

      // Assert
      expect(fss.getStatus.calledOnce).to.be.true;
      expect(jss.createJob.calledOnce).to.be.true;
    });

    it("creates multiple new uploads for backwards compatibility", async () => {
      // Arrange
      const upload: UploadJob = {
        ...mockJob,
        serviceFields: {
          type: "upload",
          files: [
            {
              file: {
                fileType: "text",
                originalPath: testFilePath,
              },
            },
            {
              file: {
                fileType: "text",
                originalPath: testFilePath,
              },
            },
          ],
        },
      };
      const fileId = "12343124";
      const localPath = "/some/path/into/fms/at/test_file.txt";
      jss.getJob.resolves(upload);
      jss.createJob.resolves(upload);
      fileReader.calculateMD5.resolves("09k2341234k");
      lk.fileExistsByNameAndMD5.resolves(false);
      fss.registerUpload.resolves({ uploadId: "091234124", chunkSize: 2424 });
      fss.repeatFinalize.resolves({
        fileId,
        chunkNumber: 14,
        uploadId: upload.jobId,
      });
      fss.getFileAttributes.resolves({
        fileId,
        localPath,
        addedToLabkey: true,
        fileName: "",
        fileSize: 4,
        md5: "",
      });

      // Act
      await fms.retry("mockUploadId", noop);

      // Assert
      expect(fss.getStatus.called).to.be.false;
      expect(jss.createJob.getCalls()).to.be.lengthOf(2);
    });

    it("resumes sending chunks for an upload with an active FSS status", async () => {
      // Arrange
      const upload: UploadJob = {
        ...mockJob,
        serviceFields: {
          type: "upload",
          files: [
            {
              file: {
                fileType: "text",
                originalPath: testFilePath,
              },
            },
          ],
          fssUploadId: "234124141",
          fssUploadChunkSize: 13,
        },
      };
      const fileId = "12343124";
      const localPath = "/some/path/into/fms/at/test_file.txt";
      jss.getJob.resolves(upload);
      fss.getStatus.resolves({
        uploadStatus: UploadStatus.WORKING,
        chunkStatuses: [],
      });
      fss.repeatFinalize.resolves({
        fileId,
        chunkNumber: 14,
        uploadId: upload.jobId,
      });
      fss.getFileAttributes.resolves({
        fileId,
        localPath,
        addedToLabkey: true,
        fileName: "",
        fileSize: 4,
        md5: "",
      });

      // Act
      await fms.retry("mockUploadId", noop);

      // Assert
      expect(jss.createJob.called).to.be.false;
      expect(fileReader.read.calledOnce).to.be.true;
    });

    it("resumes an upload that just needs finalizing", async () => {
      // Arrange
      const upload: UploadJob = {
        ...mockJob,
        serviceFields: {
          type: "upload",
          files: [
            {
              file: {
                fileType: "text",
                originalPath: testFilePath,
              },
            },
          ],
          fssUploadId: "234124141",
        },
      };
      const fileId = "12343124";
      const localPath = "/some/path/into/fms/at/test_file.txt";
      jss.getJob.resolves(upload);
      fss.getStatus.resolves({
        uploadStatus: UploadStatus.COMPLETE,
        chunkStatuses: [],
      });
      fss.repeatFinalize.resolves({
        fileId,
        chunkNumber: 14,
        uploadId: upload.jobId,
      });
      fss.getFileAttributes.resolves({
        fileId,
        localPath,
        addedToLabkey: true,
        fileName: "",
        fileSize: 4,
        md5: "",
      });

      // Act
      await fms.retry("mockUploadId", noop);

      // Assert
      expect(jss.createJob.called).to.be.false;
      expect(fileReader.read.called).to.be.false;
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
      fss.getStatus.resolves({
        uploadStatus: UploadStatus.WORKING,
        chunkStatuses: [],
      });

      // Act
      await fms.cancel(mockUploadId);

      // Assert
      expect(fileReader.cancel.calledOnce).to.be.true;
      expect(fss.cancelUpload.calledOnce).to.be.true;
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
        uploadStatus: UploadStatus.COMPLETE,
        chunkStatuses: [],
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
});

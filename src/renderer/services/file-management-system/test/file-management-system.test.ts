import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import {expect} from "chai";
import {noop} from "lodash";
import {createSandbox, SinonStubbedInstance} from "sinon";

import FileManagementSystem from "..";
import {FileStorageService, JobStatusService, MetadataManagementService,} from "../..";
import {mockJob, mockWorkingUploadJob} from "../../../state/test/mocks";
import {FSSUpload, UploadStatus} from "../../file-storage-service";
import {JSSJob, JSSJobStatus, UploadJob,} from "../../job-status-service/types";
import ChunkedFileReader from "../ChunkedFileReader";

class TestError extends Error {
  constructor() {
    super("Test.");
    this.name = "TestError";
  }
}

describe("FileManagementSystem", () => {
  const sandbox = createSandbox();
  let fileReader: SinonStubbedInstance<ChunkedFileReader>;
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
    fileReader = sandbox.createStubInstance(ChunkedFileReader);
    fss = sandbox.createStubInstance(FileStorageService);
    jss = sandbox.createStubInstance(JobStatusService);
    mms = sandbox.createStubInstance(MetadataManagementService);

    fms = new FileManagementSystem({
      fileReader: fileReader as any,
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
    it("creates appropriate metadata & completes tracking job", async () => {
      // Arrange
      const upload: UploadJob = {
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
          type: "upload",
        },
      };
      const uploadId = "091234124";
      const expectedMd5 = "testMd5";
      fss.fileExistsByNameAndSize.resolves(false);
      fss.registerUpload.resolves({ status: UploadStatus.WORKING, chunkStatuses: [], uploadId, chunkSize: 2424 });
      fileReader.read.resolves(expectedMd5)

      // Act
      await fms.upload(upload, noop);

      // Assert
      expect(
        fss.fileExistsByNameAndSize.calledOnceWithExactly(
          path.basename(testFilePath),
          testFileSize
        )
      ).to.be.true;
      expect(fileReader.read).to.have.been.calledOnce;
      expect(fss.finalize.calledOnceWithExactly(uploadId, expectedMd5)).to.be.true;
    });

    it("makes requests to FSS asyncronously", async () => {
      // Arrange
      const md5 = "09k2341234k";
      const upload: UploadJob = {
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
          type: "upload",
        },
      };
      const uploadId = "091234124";
      fss.fileExistsByNameAndSize.resolves(false);
      fss.registerUpload.resolves({ status: UploadStatus.WORKING, chunkStatuses: [], uploadId, chunkSize: 2424 });
      fileReader.read.callsFake(
        async (
          args:{uploadId: string, source: string, onProgress: (chunk: Uint8Array, partialMd5: string) => Promise<void>}):Promise<string>=>{
        for(let i = 0; i < 5; i++){
          await args.onProgress(new Uint8Array(), "");
        }
        return md5;
      });
      let inFlightFssRequests = 0;
      let wasParallelising = false;
      fss.sendUploadChunk.callsFake(async ()=>{
        inFlightFssRequests++;
        await new Promise((resolve)=>setTimeout(resolve, 25));
        if(inFlightFssRequests > 1){
          wasParallelising = true;
        }
        inFlightFssRequests--;
      });
      // Act
      await fms.upload(upload, noop);

      // Assert
      expect(wasParallelising).to.be.true;
      expect(inFlightFssRequests).to.be.equal(0);
    });

    it("restarts 'WORKING' job in FSS", async () => {
      // Arrange
      const uploadId = "elephant091234124";
      const { mtime: fileLastModified } =
          await fs.promises.stat(testFilePath);
      const fileLastModifiedInMs = fileLastModified.getTime();
      const uploadJob: UploadJob = {
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
          type: "upload",
        },
      };
      const workingUploadJob: UploadJob = {
        ...mockJob,
        status: JSSJobStatus.WORKING,
        serviceFields: {
          fssUploadId: uploadId,
          lastModifiedInMS: fileLastModifiedInMs,
          files: [
            {
              file: {
                fileType: "text",
                originalPath: testFilePath,
              },
            },
          ],
          type: "upload",
        },
      };
      const completeUploadJob: UploadJob = {
        ...mockJob,
        status: JSSJobStatus.SUCCEEDED,
        serviceFields: {
          fssUploadId: uploadId,
          lastModifiedInMS: fileLastModifiedInMs,
          files: [
            {
              file: {
                fileType: "text",
                originalPath: testFilePath,
              },
            },
          ],
          type: "upload",
        },
      };
      fss.fileExistsByNameAndSize.resolves(false);
      fss.registerUpload.onFirstCall().resolves({ status: UploadStatus.WORKING, chunkStatuses: [UploadStatus.WORKING], uploadId, chunkSize: 2424 })
          .onSecondCall().resolves({ status: UploadStatus.WORKING, chunkStatuses: [UploadStatus.WORKING,UploadStatus.WORKING], uploadId, chunkSize: 2424 });
      jss.updateJob.resolves();
      jss.createJob.resolves(workingUploadJob);
      jss.getJob
          .onFirstCall().resolves(uploadJob)
          .onSecondCall().resolves(workingUploadJob)
          .onThirdCall().resolves(completeUploadJob);
      fss.getStatus
          .onFirstCall().resolves({ status: UploadStatus.WORKING, chunkStatuses: [UploadStatus.WORKING], uploadId: "091234124", chunkSize: 2424 })
          .onSecondCall().resolves({ status: UploadStatus.COMPLETE, chunkStatuses: [UploadStatus.COMPLETE], uploadId: "091234124", chunkSize: 2424})
      const fileId = "12343124";
      const localPath = "/some/path/into/fms/at/test_file.txt";
      fss.finalize.resolves({
        errorCount: 0,
        chunkNumber: 14,
        uploadId: uploadJob.jobId,
      });
      fss.getFileAttributes.resolves({
        fileId,
        localPath,
        name: "",
        size: 4,
        md5: "",
      });

      // Act
      await fms.upload(uploadJob, noop);

      // Assert
      expect(fss.getStatus.called).to.be.true;
      expect(jss.getJob).to.have.been.callCount(3);
      expect(jss.updateJob).to.have.been.callCount(4);
      expect(fileReader.read).to.have.been.calledOnce;
    });

    it("fails upload if error occurs during read", async () => {
      // Arrange
      const error = "Test failure during read";
      const upload: UploadJob = {
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
          type: "upload",
        },
      };
      fss.fileExistsByNameAndSize.resolves(false);
      fss.registerUpload.resolves({ status: UploadStatus.WORKING, chunkStatuses: [], uploadId: "091234124", chunkSize: 2424 });
      fileReader.read.rejects(new Error(error));

      // Act
      await expect(fms.upload(upload, noop)).to.be.rejectedWith(Error);

      // Assert
      expect(
        fss.fileExistsByNameAndSize.calledOnceWithExactly(
          path.basename(testFilePath),
          testFileSize
        )
      ).to.be.true;
      expect(
        jss.updateJob.calledWithExactly(upload.jobId, {
          status: JSSJobStatus.FAILED,
          serviceFields: {
            error: `Something went wrong uploading ${upload.jobName}. Details: ${error}`,
            cancelled: false,
          },
        })
      ).to.be.true;
      expect(fileReader.read).to.have.been.calledOnce;
    });

    it("fails upload if fss errors bubble up from reader", async () => {
      // Arrange
      const upload: UploadJob = {
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
          type: "upload",
        },
      };
      const uploadId = "091234124";
      fss.fileExistsByNameAndSize.resolves(false);
      fss.registerUpload.resolves({ status: UploadStatus.WORKING, chunkStatuses: [], uploadId, chunkSize: 2424 });
      // p.getName.callsFake(() => { return "Alex Smith"; });
      fileReader.read.callsFake(async (args:{uploadId: string, source: string, onProgress: (chunk: Uint8Array, partialMd5: string) => Promise<void>}):Promise<string>=>{
        await args.onProgress(new Uint8Array(), "testMd5");
        return "completeMd5";
      });
      fss.sendUploadChunk.callsFake(async ()=>{
        throw new TestError();
      });
      // Act, Assert
      expect(fms.upload(upload, noop)).to.be.rejectedWith(TestError);
    });
  });

  describe("retry", () => {
    it("creates new upload if fss upload not tracked", async () => {
      // Arrange
      const upload: UploadJob = {
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
          type: "upload",
        },
      };
      const fileId = "12343124";
      const localPath = "/some/path/into/fms/at/test_file.txt";
      jss.getJob.resolves(upload);
      jss.createJob.resolves(upload);
      fss.fileExistsByNameAndSize.resolves(false);
      fss.registerUpload.resolves({ status: UploadStatus.WORKING, chunkStatuses: [], uploadId: "091234124", chunkSize: 2424 });
      fss.finalize.resolves({
        errorCount: 0,
        chunkNumber: 14,
        uploadId: upload.jobId,
      });
      fss.getFileAttributes.resolves({
        fileId,
        localPath,
        name: "",
        size: 4,
        md5: "",
      });

      // Act
      await fms.retry("mockUploadId", noop);

      // Assert
      expect(fss.getStatus.called).to.be.false;
      expect(jss.createJob).to.have.been.calledOnce;
    });

    it("creates new upload if fss upload not in progress (able to resume)", async () => {
      // Arrange
      const upload: UploadJob = {
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
          fssUploadId: "234124141",
          type: "upload",
        },
      };
      const fileId = "12343124";
      const localPath = "/some/path/into/fms/at/test_file.txt";
      jss.getJob.resolves(upload);
      jss.createJob.resolves(upload);
      fss.getStatus.resolves({
        uploadId: "-1",
        chunkSize: -1,
        status: UploadStatus.INACTIVE,
        chunkStatuses: [],
      });
      fss.fileExistsByNameAndSize.resolves(false);
      fss.registerUpload.resolves({ status: UploadStatus.WORKING, chunkStatuses: [], uploadId: "091234124", chunkSize: 2424 });
      fss.finalize.resolves({
        errorCount: 0,
        chunkNumber: 14,
        uploadId: upload.jobId,
      });
      fss.getFileAttributes.resolves({
        fileId,
        localPath,
        name: "",
        size: 4,
        md5: "",
      });

      // Act
      await fms.retry("mockUploadId", noop);

      // Assert
      expect(fss.getStatus).to.have.been.calledOnce;
      expect(jss.createJob).to.have.been.calledOnce;
    });

    it("creates multiple new uploads for backwards compatibility", async () => {
      // Arrange
      const upload: UploadJob = {
        ...mockJob,
        serviceFields: {
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
          type: "upload",
        },
      };
      const fileId = "12343124";
      const localPath = "/some/path/into/fms/at/test_file.txt";
      jss.getJob.resolves(upload);
      jss.createJob.resolves(upload);
      fss.fileExistsByNameAndSize.resolves(false);
      fss.registerUpload.resolves({ status: UploadStatus.WORKING, chunkStatuses: [], uploadId: "091234124", chunkSize: 2424 });
      fss.finalize.resolves({
        errorCount: 0,
        chunkNumber: 14,
        uploadId: upload.jobId,
      });
      fss.getFileAttributes.resolves({
        fileId,
        localPath,
        name: "",
        size: 4,
        md5: "",
      });

      // Act
      await fms.retry("mockUploadId", noop);

      // Assert
      expect(fss.getStatus.called).to.be.false;
      expect(jss.createJob.getCalls()).to.be.lengthOf(2);
    });

      it(`resumes sending chunks for an upload with an WORKING FSS status`, async () => {
        // Arrange
        const { mtime: fileLastModified } =
        await fs.promises.stat(testFilePath);
        const fileLastModifiedInMs = fileLastModified.getTime();
        const upload: UploadJob = {
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
            fssUploadId: "234124141",
            type: "upload",
            lastModifiedInMS: fileLastModifiedInMs,
          },
        };
        const fssUpload: JSSJob = {
          ...mockJob,
        };
        fss.getChunkInfo.resolves({cumulativeMD5: "anyMd5", size: 0, status: UploadStatus.COMPLETE})
        jss.getJob.onFirstCall().resolves(upload);
        fss.getStatus.resolves({
          status: UploadStatus.WORKING,
          chunkSize: -1,
          uploadId: "-1",
          chunkStatuses: [],
        });
        jss.getJob.onSecondCall().resolves(fssUpload);

        // Act
        await fms.retry("mockUploadId", noop);

        // Assert
        expect(jss.createJob.called).to.be.false;
        expect(fileReader.read).to.have.been.calledOnce;
      });

    it("resumes an upload that just needs finalizing", async () => {
      // Arrange
      const { mtime: fileLastModified } =
      await fs.promises.stat(testFilePath);
      const fileLastModifiedInMs = fileLastModified.getTime();
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
          fssUploadId: "234124141",
          type: "upload",
          lastModifiedInMS: fileLastModifiedInMs,
        },
      };
      const fssUploadJob: FSSUpload = {
        ...mockJob,
        serviceFields: {
          fileId: "testFileId"
        },
      };
      const fileId = "12343124";
      const localPath = "/some/path/into/fms/at/test_file.txt";
      jss.getJob.onFirstCall().resolves(fuaUploadJob).onSecondCall().resolves(fssUploadJob);
      fss.getStatus.resolves({
        uploadId: "-1",
        chunkSize: -1,
        status: UploadStatus.COMPLETE,
        chunkStatuses: [],
      });
      fss.finalize.resolves({
        errorCount: 0,
        chunkNumber: 14,
        uploadId: fuaUploadJob.jobId,
      });
      fss.getFileAttributes.resolves({
        fileId,
        localPath,
        name: "",
        size: 4,
        md5: "",
      });

      // Act
      await fms.retry("mockUploadId", noop);

      // Assert
      expect(jss.createJob.called).to.be.false;
      expect(fileReader.read.called).to.be.false;
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
      fss.getStatus.resolves({
        uploadId: "-1",
        chunkSize: -1,
        status: UploadStatus.WORKING,
        chunkStatuses: [],
      });

      // Act
      await fms.cancel(mockUploadId);

      // Assert
      expect(fileReader.cancel).to.have.been.calledOnce;
      expect(fss.cancelUpload).to.have.been.calledOnce;
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
        chunkSize: -1,
        status: UploadStatus.COMPLETE,
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

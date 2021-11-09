import { expect } from "chai";
import Logger from "js-logger";
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
import { JSSJobStatus } from "../../job-status-service/types";
import ChunkedFileReader from "../ChunkedFileReader";

describe("FileManagementSystem", () => {
  const sandbox = createSandbox();
  const fileReader = sandbox.createStubInstance(ChunkedFileReader);
  const fss = sandbox.createStubInstance(FileStorageService);
  const jss = sandbox.createStubInstance(JobStatusService);
  const lk = sandbox.createStubInstance(LabkeyClient);
  const mms = sandbox.createStubInstance(MetadataManagementService);

  const fms = new FileManagementSystem(
    {
      fileReader: fileReader as any,
      fss: fss as any,
      jss: jss as any,
      lk: lk as any,
      mms: mms as any,
    },
    sandbox.stub(Logger)
  );

  afterEach(() => {
    sandbox.resetHistory();
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
    it("TODO", () => {
      // TODO:
      expect(true).to.be.true;
    });
  });

  describe("retry", () => {
    it("creates new upload if not resumable", () => {
      // TODO:
      expect(true).to.be.true;
    });

    it("creates multiple new uploads for backwards compatibility", () => {
      // TODO:
      expect(true).to.be.true;
    });

    it("resumes sending chunks for an upload with an active FSS status", () => {
      // TODO:
      expect(true).to.be.true;
    });

    it("resumes an upload that just needs finalizing", () => {
      // TODO:
      expect(true).to.be.true;
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

import { expect } from "chai";
import * as sinon from "sinon";

describe("FileManagementSystem", () => {
  // const fms = new FileManagementSystem(
  //   {
  //     fileReader: sinon.stub(ChunkedFileReader) as any,
  //     fss: sinon.stub(FileStorageService) as any,
  //     jss: sinon.stub(JobStatusService) as any,
  //     lk: sinon.stub(LabkeyClient) as any,
  //     mms: sinon.stub(MetadataManagementService) as any,
  //   },
  //   sinon.stub(Logger)
  // );

  afterEach(() => {
    sinon.resetHistory();
  });

  after(() => {
    sinon.restore();
  });

  describe("initiateUpload", () => {
    it("TODO", () => {
      // TODO:
      expect(true).to.be.true;
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
    it("cancels upload in FSS if possible", () => {
      // TODO:
      expect(true).to.be.true;
    });

    it("sets job status to FAILED with cancellation flag", () => {
      // TODO:
      expect(true).to.be.true;
    });

    it("rejects cancellation if upload not in progress", () => {
      // TODO:
      expect(true).to.be.true;
    });
  });
});

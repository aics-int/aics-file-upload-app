import * as path from "path";

import { expect } from "chai";
import * as Logger from "js-logger";
import { ILogger } from "js-logger/src/types";
import * as rimraf from "rimraf";
import { createSandbox, match, SinonStub, stub } from "sinon";

import { LocalStorageStub } from "../../../state/test/configure-mock-store";
import { mockWorkingAddMetadataJob } from "../../../state/test/mocks";
import { AICSFILES_LOGGER, UPLOAD_WORKER_SUCCEEDED } from "../constants";
import { StepExecutor } from "../helpers/step-executor";
import {
  ADD_METADATA_TYPE,
  COPY_CHILD_TYPE,
  COPY_TYPE,
  Uploader,
} from "../helpers/uploader";

import {
  fss,
  jobStatusClient,
  mockCompleteUploadJob,
  mockCopyJobChild1,
  mockCopyJobChild2,
  mockCopyJobParent,
  mockJob,
  mockRetryableUploadJob,
  responseFile1,
  responseFile2,
  resultFiles,
  startUploadResponse,
  storage,
  targetDir,
  upload1,
  upload2,
  uploadJobId,
  uploads,
} from "./mocks";

export const differentTargetDir = path.resolve("./aics");
export const differentTargetFile1 = path.resolve(
  differentTargetDir,
  path.basename(upload1)
);
export const differentTargetFile2 = path.resolve(
  differentTargetDir,
  path.basename(upload2)
);
describe("Uploader", () => {
  const sandbox = createSandbox();
  let updateJobStub: SinonStub, uploader: Uploader, getJobsStub: SinonStub;
  const uploadJobName = "Upload job name";
  let logger: ILogger;
  let copyWorkerStub: {
    postMessage: SinonStub;
    onmessage: SinonStub;
    onerror: SinonStub;
  };

  beforeEach(() => {
    copyWorkerStub = {
      onmessage: stub(),
      onerror: stub(),
      postMessage: stub(),
    };
    sandbox.replace(
      StepExecutor,
      "executeSteps",
      stub().resolves({ resultFiles })
    );
    updateJobStub = stub().resolves();
    getJobsStub = stub()
      .onFirstCall()
      // upload job children
      .resolves([mockCopyJobParent, mockJob])
      // copy job children
      .onSecondCall()
      .resolves([mockCopyJobChild1, mockCopyJobChild2]);
    sandbox.replace(jobStatusClient, "getJobs", getJobsStub);
    sandbox.replace(jobStatusClient, "updateJob", updateJobStub);
    sandbox.replace(
      fss,
      "uploadComplete",
      stub().resolves({
        files: resultFiles,
        jobId: uploadJobId,
      })
    );
    logger = Logger.get(AICSFILES_LOGGER);
    sandbox.replace(logger, "error", stub());
    uploader = new Uploader(
      stub().returns(copyWorkerStub),
      fss,
      jobStatusClient,
      storage,
      logger
    );
  });

  afterEach(() => {
    sandbox.restore();
    rimraf.sync(targetDir);
    rimraf.sync(differentTargetDir);
  });

  // Here we fake a successful copy by calling onmessage right after postMessage is called off of the copy worker stub
  // Without this, onmessage would never get called and the tests would timeout
  const fakeSuccessfulCopy = () => {
    const postMessageStub = stub().callsFake(() => {
      copyWorkerStub.onmessage({
        data: `${UPLOAD_WORKER_SUCCEEDED}:somemd5`,
      });
    });
    sandbox.replace(copyWorkerStub, "postMessage", postMessageStub);
    return postMessageStub;
  };

  describe("uploadFiles", () => {
    it("Creates new upload child jobs and copy jobs, and returns expected result", async () => {
      fakeSuccessfulCopy();
      const createJobStub = stub().resolves();
      sandbox.replace(jobStatusClient, "createJob", createJobStub);
      const result = await uploader.uploadFiles(
        startUploadResponse,
        uploads,
        uploadJobName
      );
      expect(createJobStub).to.have.been.calledWithMatch({
        serviceFields: {
          type: COPY_TYPE,
        },
      });
      expect(createJobStub).to.have.been.calledWithMatch({
        serviceFields: {
          type: ADD_METADATA_TYPE,
        },
      });
      expect(createJobStub).to.have.been.calledWithMatch({
        serviceFields: {
          type: COPY_CHILD_TYPE,
          originalPath: upload1,
        },
      });
      expect(createJobStub).to.have.been.calledWithMatch({
        serviceFields: {
          type: COPY_CHILD_TYPE,
          originalPath: upload2,
        },
      });
      expect(getJobsStub).not.to.have.been.called;
      expect(result).to.deep.equal({
        [path.basename(upload1)]: responseFile1,
        [path.basename(upload2)]: responseFile2,
      });
    });

    it("Doesn't start copying files if creating upload jobs fails", async () => {
      expect(copyWorkerStub.postMessage.called).to.be.false;
      jobStatusClient.createJob = stub().rejects();
      const uploader2 = new Uploader(
        stub().returns(copyWorkerStub),
        fss,
        jobStatusClient,
        storage
      );

      await expect(
        uploader2.uploadFiles(startUploadResponse, uploads, "jobName")
      ).to.be.rejectedWith("Failed to create child upload job");
      expect(copyWorkerStub.postMessage.called).to.be.false;
    });

    it("Replaces the default mount point with the new mount point if specified", async () => {
      const createUploadStub = stub()
        .onFirstCall()
        .resolves(mockCopyJobParent)
        .onSecondCall()
        .resolves(mockWorkingAddMetadataJob)
        .onThirdCall()
        .resolves(mockCopyJobChild1)
        .onCall(4)
        .resolves(mockCopyJobChild2);
      sandbox.replace(jobStatusClient, "createJob", createUploadStub);
      const postMessageStub = fakeSuccessfulCopy();
      sandbox.replace(
        (storage as any) as LocalStorageStub,
        "get",
        stub().returns({
          mountPoint: differentTargetDir,
        })
      );
      await uploader.uploadFiles(startUploadResponse, uploads, "jobName");
      expect(
        postMessageStub.calledWith(
          match.array.contains([differentTargetFile1, differentTargetFile2])
        )
      );
    });
  });

  describe("retryUpload", () => {
    it("Throws error if upload job provided is missing serviceFields.uploadDirectory", () => {
      expect(
        uploader.retryUpload(uploads, {
          ...mockRetryableUploadJob,
          serviceFields: {
            ...mockRetryableUploadJob.serviceFields,
            uploadDirectory: undefined,
          },
        })
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if unrecoverable upload job provided", () => {
      expect(
        uploader.retryUpload(uploads, {
          ...mockJob,
          status: "UNRECOVERABLE",
        })
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if working upload job provided", () => {
      expect(
        uploader.retryUpload(uploads, { ...mockJob, status: "WORKING" })
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if retrying upload job provided", () => {
      expect(
        uploader.retryUpload(uploads, {
          ...mockJob,
          status: "RETRYING",
        })
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if blocked upload job provided", () => {
      expect(
        uploader.retryUpload(uploads, { ...mockJob, status: "BLOCKED" })
      ).to.be.rejectedWith(Error);
    });
    it("Returns previous output stored on upload job if upload job provided succeeded", async () => {
      const createJobStub = stub();
      sandbox.replace(jobStatusClient, "createJob", createJobStub);
      const result = await uploader.retryUpload(uploads, mockCompleteUploadJob);
      expect(createJobStub.called).to.be.false;
      expect(getJobsStub.called).to.be.false;
      expect(result).to.deep.equal(resultFiles);
    });
    // it("Retries upload if failed upload job provided", () => {});
    // it("Runs upload if waiting upload job provided", () => {});
    it("Does not create new jobs", async () => {
      const createJobStub = stub();
      sandbox.replace(jobStatusClient, "createJob", createJobStub);
      fakeSuccessfulCopy();
      await uploader.retryUpload(uploads, mockRetryableUploadJob);
      expect(updateJobStub).to.have.been.calledWithMatch("uploadJobId", {
        status: "RETRYING",
      });
      expect(createJobStub.called).to.be.false;
      expect(getJobsStub.called).to.be.true;
    });
    it("Creates new upload child jobs if uploadJob.childIds is not defined", async () => {
      fakeSuccessfulCopy();
      const createJobStub = stub()
        .onFirstCall()
        .resolves(mockCopyJobParent)
        .onSecondCall()
        .resolves(mockWorkingAddMetadataJob);
      sandbox.replace(jobStatusClient, "createJob", createJobStub);
      await uploader.retryUpload(uploads, {
        ...mockRetryableUploadJob,
        childIds: undefined,
      });
      expect(createJobStub.called).to.be.true;
    });
    it("Throws error if uploads is empty", () => {
      return expect(
        uploader.retryUpload({}, mockRetryableUploadJob)
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if number of child jobs retrieved through JSS is not 2", () => {
      getJobsStub = stub()
        .onFirstCall()
        // upload job children
        .resolves([mockJob, mockCopyJobParent])
        // copy job children
        .onSecondCall()
        .resolves([mockCopyJobChild1]);
      jobStatusClient.getJobs = getJobsStub;
      const uploader2 = new Uploader(
        stub().returns(copyWorkerStub),
        fss,
        jobStatusClient,
        storage,
        logger
      );
      return expect(
        uploader2.retryUpload(uploads, mockRetryableUploadJob)
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if it cannot find copy parent job", () => {
      getJobsStub = stub()
        .onFirstCall()
        // upload job children
        .resolves([
          mockJob,
          {
            ...mockCopyJobParent,
            serviceFields: {
              ...mockCopyJobParent.serviceFields,
              type: undefined,
            },
          },
        ])
        // copy job children
        .onSecondCall()
        .resolves([mockCopyJobChild1, mockCopyJobChild2]);
      jobStatusClient.getJobs = getJobsStub;
      const uploader2 = new Uploader(
        stub().returns(copyWorkerStub),
        fss,
        jobStatusClient,
        storage,
        logger
      );
      return expect(
        uploader2.retryUpload(uploads, mockRetryableUploadJob)
      ).to.be.rejectedWith(Error);
    });
    it("Throws error if the number of copy jobs is not expected", () => {
      getJobsStub = stub()
        .onFirstCall()
        // upload job children
        .resolves([
          mockJob,
          {
            ...mockCopyJobParent,
            serviceFields: {
              ...mockCopyJobParent.serviceFields,
              type: undefined,
            },
          },
        ])
        // copy job children
        .onSecondCall()
        .resolves([mockCopyJobChild1]);
      jobStatusClient.getJobs = getJobsStub;
      const uploader2 = new Uploader(
        stub().returns(copyWorkerStub),
        fss,
        jobStatusClient,
        storage
      );
      expect(
        uploader2.retryUpload(uploads, mockRetryableUploadJob)
      ).to.be.rejectedWith("Could not find the parent copy job.");
    });
    it("Throws error if a copy job is missing originalPath", () => {
      getJobsStub = stub()
        .onFirstCall()
        // upload job children
        .resolves([
          mockJob,
          {
            ...mockCopyJobParent,
            serviceFields: {
              ...mockCopyJobParent.serviceFields,
              type: undefined,
            },
          },
        ])
        // copy job children
        .onSecondCall()
        .resolves([
          mockCopyJobChild1,
          {
            ...mockCopyJobChild2,
            serviceFields: {
              ...mockCopyJobChild2.serviceFields,
              originalPath: undefined,
            },
          },
        ]);
      jobStatusClient.getJobs = getJobsStub;
      const uploader2 = new Uploader(
        stub().returns(copyWorkerStub),
        fss,
        jobStatusClient,
        storage
      );
      expect(
        uploader2.retryUpload(uploads, mockRetryableUploadJob)
      ).to.be.rejectedWith(Error);
    });
  });
});

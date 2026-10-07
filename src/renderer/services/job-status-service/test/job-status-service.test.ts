import { expect } from "chai";
import { createStubInstance, createSandbox, stub } from "sinon";

import JobStatusService from "..";
import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { LocalStorage } from "../../../types";
import HttpCacheClient from "../../http-cache-client";
import { JobQuery } from "../types";

import {
  badGatewayResponse,
  mockJobResponse,
  mockJSSJob,
  mockCreateJobRequest,
  badRequestResponse,
  internalServerError,
  mockUpdateJobRequest,
  makeAxiosResponse,
} from "./mocks";

const storage = createStubInstance(EnvironmentAwareStorage);
// Stub `get` specifically, since it is a class property and not on the prototype
storage.get = stub() as any;

const httpClient = createStubInstance(
  HttpCacheClient
) as any as HttpCacheClient;

describe("JobStatusService", () => {
  const sandbox = createSandbox();
  const jobStatusClient = new JobStatusService(
    httpClient,
    storage as any as LocalStorage,
    false,
    "1.0"
  );
  afterEach(() => {
    sandbox.restore();
  });

  describe("createJob", () => {
    it("Returns job created by JSS", async () => {
      sandbox.replace(
        httpClient,
        "post",
        stub().resolves(makeAxiosResponse(mockJobResponse))
      );

      const result = await jobStatusClient.createJob(mockCreateJobRequest);
      expect(result).to.deep.equal(mockJobResponse.data[0]);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(badRequestResponse));

      return expect(
        jobStatusClient.createJob(mockCreateJobRequest)
      ).to.be.rejectedWith(badGatewayResponse);
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(badRequestResponse));

      return expect(
        jobStatusClient.createJob(mockCreateJobRequest)
      ).to.be.rejectedWith(badRequestResponse);
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(internalServerError));

      return expect(
        jobStatusClient.createJob(mockCreateJobRequest)
      ).to.be.rejectedWith(internalServerError);
    });
  });

  describe("updateJob", () => {
    it("Returns updated job from JSS", async () => {
      sandbox.replace(
        httpClient,
        "patch",
        stub().resolves(makeAxiosResponse(mockJobResponse))
      );

      const result = await jobStatusClient.updateJob(
        "some_job",
        mockUpdateJobRequest
      );
      expect(result).to.deep.equal(mockJobResponse.data[0]);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "patch", stub().rejects(badGatewayResponse));

      return expect(
        jobStatusClient.updateJob("some_job", mockCreateJobRequest)
      ).to.be.rejectedWith(badGatewayResponse);
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "patch", stub().rejects(badRequestResponse));

      return expect(
        jobStatusClient.updateJob("some_job", mockCreateJobRequest)
      ).to.be.rejectedWith(badRequestResponse);
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "patch", stub().rejects(internalServerError));

      return expect(
        jobStatusClient.updateJob("some_job", mockCreateJobRequest)
      ).to.be.rejectedWith(internalServerError);
    });
  });

  describe("getJob", () => {
    it("Returns job from JSS", async () => {
      sandbox.replace(
        httpClient,
        "get",
        stub().resolves(makeAxiosResponse(mockJobResponse))
      );

      const result = await jobStatusClient.getJob("some_job");
      expect(result).to.deep.equal(mockJobResponse.data[0]);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(badGatewayResponse));

      return expect(jobStatusClient.getJob("some_job")).to.be.rejectedWith(
        badGatewayResponse
      );
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(badRequestResponse));

      return expect(jobStatusClient.getJob("some_job")).to.be.rejectedWith(
        badRequestResponse
      );
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(internalServerError));

      return expect(jobStatusClient.getJob("some_job")).to.be.rejectedWith(
        internalServerError
      );
    });
  });

  describe("existsById", () => {
    it("Returns true when job successfully retrieved from JSS", async () => {
      sandbox.replace(
        httpClient,
        "get",
        stub().resolves(makeAxiosResponse(mockJobResponse))
      );

      const jobExists = await jobStatusClient.existsById("some_job");
      expect(jobExists).to.be.true;
    });

    it("Returns false if JSS returns an error", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(badGatewayResponse));

      const jobExists = await jobStatusClient.existsById("some_job");
      expect(jobExists).to.be.false;
    });
  });

  describe("getJobs", () => {
    const mockQuery: JobQuery = {
      user: "foo",
    };
    it("Returns job from JSS", async () => {
      sandbox.replace(
        httpClient,
        "post",
        stub().resolves(makeAxiosResponse(mockJobResponse))
      );

      const result = await jobStatusClient.getJobs(mockQuery);
      expect(result).to.deep.equal(mockJobResponse.data);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(badGatewayResponse));

      return expect(jobStatusClient.getJobs(mockQuery)).to.be.rejectedWith(
        badGatewayResponse
      );
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(badRequestResponse));
      return expect(jobStatusClient.getJobs(mockQuery)).to.be.rejectedWith(
        badRequestResponse
      );
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "post", stub().rejects(internalServerError));
      return expect(jobStatusClient.getJobs(mockQuery)).to.be.rejectedWith(
        internalServerError
      );
    });
  });
});

describe("JobStatusService 2.0", () => {
  const sandbox = createSandbox();
  const jobStatusClient = new JobStatusService(
    httpClient,
    storage as any as LocalStorage,
    false,
    "2.0"
  );
  const { jobId, ...mockV2Job } = { ...mockJSSJob, id: mockJSSJob.jobId };
  afterEach(() => {
    sandbox.restore();
  });

  describe("getJob", () => {
    it("Returns bare job with id mapped to jobId", async () => {
      const getStub = stub().resolves(makeAxiosResponse(mockV2Job));
      sandbox.replace(httpClient, "get", getStub);

      const result = await jobStatusClient.getJob(jobId);
      expect(result).to.deep.equal(mockJSSJob);
      expect(getStub.firstCall.args[0]).to.contain(`/jss/2.0/job/${jobId}`);
    });
  });

  describe("updateJob", () => {
    it("Returns bare job", async () => {
      sandbox.replace(
        httpClient,
        "patch",
        stub().resolves(makeAxiosResponse(mockV2Job))
      );

      const result = await jobStatusClient.updateJob(
        jobId,
        mockUpdateJobRequest
      );
      expect(result).to.deep.equal(mockV2Job);
    });
  });

  describe("getJobs", () => {
    it("Requests the given page and maps bare jobs", async () => {
      const postStub = stub().resolves(makeAxiosResponse([mockV2Job]));
      sandbox.replace(httpClient, "post", postStub);

      const result = await jobStatusClient.getJobs({ user: "foo" }, 3);
      expect(result).to.deep.equal([mockJSSJob]);
      expect(postStub.firstCall.args[0]).to.contain(
        "/jss/2.0/job/query?page=3&page_size=100&sort=created(DESC)"
      );
    });
  });

  describe("getAllJobs", () => {
    it("Requests pages until one is empty", async () => {
      const postStub = stub();
      postStub.onCall(0).resolves(makeAxiosResponse([mockV2Job]));
      postStub.onCall(1).resolves(makeAxiosResponse([mockV2Job]));
      postStub.onCall(2).resolves(makeAxiosResponse([]));
      sandbox.replace(httpClient, "post", postStub);

      const result = await jobStatusClient.getAllJobs({ user: "foo" });
      expect(result).to.deep.equal([mockJSSJob, mockJSSJob]);
      expect(postStub.callCount).to.equal(3);
      expect(postStub.thirdCall.args[0]).to.contain("page=3");
    });
  });
});

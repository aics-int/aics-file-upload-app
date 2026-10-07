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
    false
  );
  const jobId = mockJSSJob.id;
  afterEach(() => {
    sandbox.restore();
  });

  describe("updateJob", () => {
    it("Returns updated job from JSS", async () => {
      const patchStub = stub().resolves(makeAxiosResponse(mockJobResponse));
      sandbox.replace(httpClient, "patch", patchStub);

      const result = await jobStatusClient.updateJob(
        jobId,
        mockUpdateJobRequest
      );
      expect(result).to.deep.equal(mockJSSJob);
      expect(patchStub.firstCall.args[0]).to.contain(`/jss/2.0/job/${jobId}`);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "patch", stub().rejects(badGatewayResponse));

      return expect(
        jobStatusClient.updateJob(jobId, mockUpdateJobRequest)
      ).to.be.rejectedWith(badGatewayResponse);
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "patch", stub().rejects(badRequestResponse));

      return expect(
        jobStatusClient.updateJob(jobId, mockUpdateJobRequest)
      ).to.be.rejectedWith(badRequestResponse);
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "patch", stub().rejects(internalServerError));

      return expect(
        jobStatusClient.updateJob(jobId, mockUpdateJobRequest)
      ).to.be.rejectedWith(internalServerError);
    });
  });

  describe("getJob", () => {
    it("Returns job from JSS", async () => {
      const getStub = stub().resolves(makeAxiosResponse(mockJobResponse));
      sandbox.replace(httpClient, "get", getStub);

      const result = await jobStatusClient.getJob(jobId);
      expect(result).to.deep.equal(mockJSSJob);
      expect(getStub.firstCall.args[0]).to.contain(`/jss/2.0/job/${jobId}`);
    });
    it("Returns error response if JSS returns a 502", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(badGatewayResponse));

      return expect(jobStatusClient.getJob(jobId)).to.be.rejectedWith(
        badGatewayResponse
      );
    });
    it("Returns error response if JSS returns a 400", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(badRequestResponse));

      return expect(jobStatusClient.getJob(jobId)).to.be.rejectedWith(
        badRequestResponse
      );
    });
    it("Returns error response if JSS returns a 500", async () => {
      sandbox.replace(httpClient, "get", stub().rejects(internalServerError));

      return expect(jobStatusClient.getJob(jobId)).to.be.rejectedWith(
        internalServerError
      );
    });
  });

  describe("getJobs", () => {
    const mockQuery: JobQuery = {
      user: "foo",
    };
    it("Requests the given page and returns its jobs", async () => {
      const postStub = stub().resolves(makeAxiosResponse([mockJobResponse]));
      sandbox.replace(httpClient, "post", postStub);

      const result = await jobStatusClient.getJobs(mockQuery, 3);
      expect(result).to.deep.equal([mockJSSJob]);
      expect(postStub.firstCall.args[0]).to.contain(
        "/jss/2.0/job/query?page=3&page_size=100&sort=created(DESC)"
      );
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

  describe("getAllJobs", () => {
    it("Requests pages until one is empty", async () => {
      const postStub = stub();
      postStub.onCall(0).resolves(makeAxiosResponse([mockJobResponse]));
      postStub.onCall(1).resolves(makeAxiosResponse([mockJobResponse]));
      postStub.onCall(2).resolves(makeAxiosResponse([]));
      sandbox.replace(httpClient, "post", postStub);

      const result = await jobStatusClient.getAllJobs({ user: "foo" });
      expect(result).to.deep.equal([mockJSSJob, mockJSSJob]);
      expect(postStub.callCount).to.equal(3);
      expect(postStub.thirdCall.args[0]).to.contain("page=3");
    });
  });
});

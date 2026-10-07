import { AxiosError, AxiosResponse } from "axios";
import { stub } from "sinon";

import { UploadJob, JSSJobStatus, UpdateJobRequest, Service } from "../types";

export const mockUpdateJobRequest: UpdateJobRequest = {
  status: JSSJobStatus.WAITING,
};

export const mockJSSJob: UploadJob = {
  jobName: "mockJob",
  created: new Date("2019-06-18T15:31:45.610+0000"),
  id: "ae64e5c79d244d93a962aac50159ecc0",
  modified: new Date("2019-06-18T15:31:45.610+0000"),
  status: JSSJobStatus.WAITING,
  user: "demo",
  service: Service.FILE_STORAGE_SERVICE,
  serviceFields: {
    uploadRequest: {
      files: [],
      type: "upload",
    },
  },
};

// 2.0 returns jobs bare rather than wrapped in a response object
export const mockJobResponse = mockJSSJob;

export const makeAxiosResponse = <T>(resp: T): AxiosResponse<T> => ({
  data: resp,
  status: 200,
  statusText: "OK",
  headers: {},
  config: {},
  request: {},
});

const axiosError: AxiosError = stub() as any as AxiosError;
const axiosResponse: AxiosResponse = stub() as any as AxiosResponse;
export const badGatewayResponse: AxiosError = {
  ...axiosError,
  response: {
    ...axiosResponse,
    status: 502,
  },
};
export const badRequestResponse: AxiosError = {
  ...axiosError,
  response: {
    ...axiosResponse,
    status: 400,
  },
};
export const internalServerError: AxiosError = {
  ...axiosError,
  response: {
    ...axiosResponse,
    status: 500,
  },
};

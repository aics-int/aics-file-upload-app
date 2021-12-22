import axios, { AxiosRequestConfig } from "axios";
import { camelizeKeys, decamelizeKeys } from "humps";
import * as Logger from "js-logger";
import { ILogger, ILogLevel } from "js-logger/src/types";
import { castArray } from "lodash";

import { LocalStorage } from "../../types";
import HttpCacheClient from "../http-cache-client";
import { AicsSuccessResponse, HttpClient } from "../types";

import JSSRequestMapper from "./jss-request-mapper";
import JSSResponseMapper from "./jss-response-mapper";
import {
  CreateJobRequest,
  JobQuery,
  UploadJob,
  UpdateJobRequest,
  JSSJob,
} from "./types";

const logLevelMap: { [logLevel: string]: ILogLevel } = Object.freeze({
  debug: Logger.DEBUG,
  error: Logger.ERROR,
  info: Logger.INFO,
  trace: Logger.TRACE,
  warn: Logger.WARN,
});
// Timeout was chosen to match timeout used by aicsfiles-python
const DEFAULT_TIMEOUT = 5 * 60 * 1000;
const JOB_STATUS_CLIENT_LOGGER = "job-status-client";

/***
 * Main class used by clients of this library to interact with JSS. Provides job create/read/update functionality.
 */
export default class JobStatusService extends HttpCacheClient {
  private readonly logger: ILogger;

  /***
   * Create a JobStatusService instance.
   * @param httpClient
   * @param storage
   * @param useCache
   * @param logLevel minimum severity to log at
   */
  public constructor(
    httpClient: HttpClient,
    storage: LocalStorage,
    useCache = false,
    logLevel: "debug" | "error" | "info" | "trace" | "warn" = "error"
  ) {
    super(httpClient, storage, useCache);
    /* eslint-disable react-hooks/rules-of-hooks */
    Logger.useDefaults({ defaultLevel: logLevelMap[logLevel] });
    this.logger = Logger.get(JOB_STATUS_CLIENT_LOGGER);
  }

  /**
   * Creates a job and returns created job
   * @param job
   */
  public async createJob(job: CreateJobRequest): Promise<UploadJob> {
    this.logger.debug("Received create job request", job);
    const response = await this.post<AicsSuccessResponse<UploadJob>>(
      "/jss/1.0/job/",
      job,
      JobStatusService.getHttpRequestConfig()
    );
    return response.data[0];
  }

  /***
   * Update Job in stored in JSS and returns updated job
   * @param jobId job to update
   * @param job partial job object with values to set
   * @param patchUpdateServiceFields indicates whether to patch update serviceFields of the job or replace the entire
   * serviceFields object in db with serviceFields provided in request.
   */
  public async updateJob(
    jobId: string,
    job: UpdateJobRequest,
    patchUpdateServiceFields = true
  ): Promise<UploadJob> {
    this.logger.debug(`Received update job request for jobId=${jobId}`, job);
    const response = await this.patch<AicsSuccessResponse<UploadJob>>(
      `/jss/1.0/job/${jobId}`,
      JSSRequestMapper.map(job, patchUpdateServiceFields),
      JobStatusService.getHttpRequestConfig()
    );
    return response.data[0];
  }

  /***
   * Returns true if job exists in JSS
   * @param jobId corresponding id for job
   */
  public async existsById(jobId: string): Promise<boolean> {
    this.logger.debug(`Received get job exists request for jobId=${jobId}`);
    try {
      await this.get<AicsSuccessResponse<UploadJob>>(
        `/jss/1.0/job/${jobId}`,
        JobStatusService.getHttpRequestConfig()
      );
    } catch (_) {
      return false;
    }
    return true;
  }

  /***
   * Get job by id
   * @param jobId corresponding id for job
   */
  public async getJob(jobId: string): Promise<JSSJob> {
    this.logger.debug(`Received get job request for jobId=${jobId}`);
    const response = await this.get<AicsSuccessResponse<UploadJob>>(
      `/jss/1.0/job/${jobId}`,
      JobStatusService.getHttpRequestConfig()
    );
    return JSSResponseMapper.map(response.data[0]);
  }

  /***
   * Get jobs matching mongoDB query
   * @param query query to be passed to mongoDB for finding matching jobs
   */
  public async getJobs(query: JobQuery): Promise<JSSJob[]> {
    this.logger.debug(`Received get jobs request with query`, query);
    const response = await this.post<AicsSuccessResponse<UploadJob>>(
      `/jss/1.0/job/query`,
      JSSRequestMapper.map(query, true),
      JobStatusService.getHttpRequestConfig()
    );
    return response.data.map((job: UploadJob) => JSSResponseMapper.map(job));
  }

  // JSS expects properties of requests to be in snake_case format and returns responses in snake_case format as well
  private static getHttpRequestConfig(): AxiosRequestConfig {
    return {
      timeout: DEFAULT_TIMEOUT,
      transformResponse: [
        ...castArray(axios.defaults.transformResponse),
        (data) => camelizeKeys(data),
      ],
      transformRequest: [
        (data) => decamelizeKeys(data),
        ...castArray(axios.defaults.transformRequest),
      ],
    };
  }
}
import axios, { AxiosRequestConfig } from "axios";
import { camelizeKeys, decamelizeKeys } from "humps";
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

// Timeout was chosen to match timeout used by aicsfiles-python
const DEFAULT_TIMEOUT = 5 * 60 * 1000;
const V2_PAGE_SIZE = 100;

export type JSSApiVersion = "1.0" | "2.0";

// 1.0 wraps every response in `{ data: [...] }`, 2.0 returns the job or array of jobs directly
type JSSResponse<T> = AicsSuccessResponse<T> | T | T[];

/***
 * Main class used by clients of this library to interact with JSS. Provides job create/read/update functionality.
 */
export default class JobStatusService extends HttpCacheClient {
  private readonly apiVersion: JSSApiVersion;

  constructor(
    httpClient: HttpClient,
    localStorage: LocalStorage,
    useCache: boolean,
    apiVersion: JSSApiVersion
  ) {
    super(httpClient, localStorage, useCache);
    this.apiVersion = apiVersion;
  }

  /**
   * Creates a job and returns created job
   * @param job
   */
  public async createJob(job: CreateJobRequest): Promise<UploadJob> {
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
    const response = await this.patch<JSSResponse<UploadJob>>(
      `/jss/${this.apiVersion}/job/${jobId}`,
      JSSRequestMapper.map(job, patchUpdateServiceFields),
      JobStatusService.getHttpRequestConfig()
    );
    return this.unwrapJob(response);
  }

  /***
   * Returns true if job exists in JSS
   * @param jobId corresponding id for job
   */
  public async existsById(jobId: string): Promise<boolean> {
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
    const response = await this.get<JSSResponse<UploadJob>>(
      `/jss/${this.apiVersion}/job/${jobId}`,
      JobStatusService.getHttpRequestConfig()
    );
    return JSSResponseMapper.map(this.unwrapJob(response));
  }

  /***
   * Get job by id, or null if JSS has no job with that id
   * @param jobId corresponding id for job
   */
  public async getJobOrNull(jobId: string): Promise<JSSJob | null> {
    try {
      return await this.getJob(jobId);
    } catch (error) {
      if (error?.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /***
   * Get jobs matching mongoDB query. 2.0 returns one page of jobs, newest first; 1.0 is not paged.
   * @param query query to be passed to mongoDB for finding matching jobs
   * @param page 1-indexed page to request, only used by 2.0
   */
  public async getJobs(query: JobQuery, page = 1): Promise<JSSJob[]> {
    const url =
      this.apiVersion === "2.0"
        ? `/jss/2.0/job/query?page=${page}&page_size=${V2_PAGE_SIZE}&sort=created(DESC)`
        : "/jss/1.0/job/query";
    const response = await this.post<JSSResponse<UploadJob>>(
      url,
      JSSRequestMapper.map(query, true),
      JobStatusService.getHttpRequestConfig()
    );
    const jobs =
      this.apiVersion === "2.0"
        ? (response as UploadJob[])
        : (response as AicsSuccessResponse<UploadJob>).data;
    return jobs.map((job: UploadJob) => JSSResponseMapper.map(job));
  }

  /***
   * Get every job matching mongoDB query, requesting pages until an empty page is returned. 2.0 only.
   * @param query query to be passed to mongoDB for finding matching jobs
   */
  public async getAllJobs(query: JobQuery): Promise<JSSJob[]> {
    const allJobs: JSSJob[] = [];
    for (let page = 1; ; page++) {
      const jobs = await this.getJobs(query, page);
      if (!jobs.length) {
        return allJobs;
      }
      allJobs.push(...jobs);
    }
  }

  private unwrapJob(response: JSSResponse<UploadJob>): UploadJob {
    return this.apiVersion === "2.0"
      ? (response as UploadJob)
      : (response as AicsSuccessResponse<UploadJob>).data[0];
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

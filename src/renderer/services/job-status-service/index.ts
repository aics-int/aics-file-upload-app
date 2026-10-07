import axios, { AxiosRequestConfig } from "axios";
import { camelizeKeys, decamelizeKeys } from "humps";
import { castArray } from "lodash";

import HttpCacheClient from "../http-cache-client";

import JSSRequestMapper from "./jss-request-mapper";
import JSSResponseMapper from "./jss-response-mapper";
import { JobQuery, UploadJob, UpdateJobRequest, JSSJob } from "./types";

// Timeout was chosen to match timeout used by aicsfiles-python
const DEFAULT_TIMEOUT = 5 * 60 * 1000;
const PAGE_SIZE = 100;

/***
 * Main class used by clients of this library to interact with JSS. Provides job read/update functionality.
 */
export default class JobStatusService extends HttpCacheClient {
  /***
   * Patch the given fields of a job stored in JSS and return the updated job.
   * Service fields are written as dot-path patches, so fields not provided are left untouched.
   * @param jobId job to update
   * @param job partial job object with values to set
   */
  public async updateJob(
    jobId: string,
    job: UpdateJobRequest
  ): Promise<UploadJob> {
    const response = await this.patch<UploadJob>(
      `/jss/2.0/job/${jobId}`,
      JSSRequestMapper.map(job, true),
      JobStatusService.getHttpRequestConfig()
    );
    return JSSResponseMapper.map(response);
  }

  /***
   * Get job by id
   * @param jobId corresponding id for job
   */
  public async getJob(jobId: string): Promise<JSSJob> {
    const response = await this.get<UploadJob>(
      `/jss/2.0/job/${jobId}`,
      JobStatusService.getHttpRequestConfig()
    );
    return JSSResponseMapper.map(response);
  }

  /***
   * Get one page of jobs matching mongoDB query, newest first
   * @param query query to be passed to mongoDB for finding matching jobs
   * @param page 1-indexed page to request
   */
  public async getJobs(query: JobQuery, page = 1): Promise<JSSJob[]> {
    const response = await this.post<UploadJob[]>(
      `/jss/2.0/job/query?page=${page}&page_size=${PAGE_SIZE}&sort=created(DESC)`,
      JSSRequestMapper.map(query, true),
      JobStatusService.getHttpRequestConfig()
    );
    return response.map((job: UploadJob) => JSSResponseMapper.map(job));
  }

  /***
   * Get every job matching mongoDB query, requesting pages until an empty page is returned
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

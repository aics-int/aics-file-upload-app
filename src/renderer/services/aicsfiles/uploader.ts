import { stat as fsStat } from "fs";
import { hostname, platform, userInfo } from "os";
import { promisify } from "util";

import { AxiosError } from "axios";
import * as Logger from "js-logger";
import { ILogger } from "js-logger/src/types";
import { includes, keys, noop, pick } from "lodash";
import * as uuid from "uuid";

import JobStatusClient from "../job-status-client";
import {
  CreateJobRequest,
  JSSJob,
  JSSJobStatus,
} from "../job-status-client/types";

import { FSSConnection } from "./connections";
import { UnrecoverableJobError } from "./errors/UnrecoverableJobError";
import {
  AICSFILES_LOGGER,
  getCopyChildJobName,
} from "./file-management-system";
import { StepExecutor } from "./step-executor";
import { AddMetadataStep } from "./steps/add-metadata-step";
import { CopyFilesStep } from "./steps/copy-files-step";
import {
  FSSResponseFile,
  Job,
  StartUploadResponse,
  Step,
  StepName,
  UploadContext,
  UploadResponse,
  Uploads,
} from "./types";
import { makePosixPathCompatibleWithPlatform } from "./util";

const EXPECTED_NUMBER_UPLOAD_STEPS = 2;
export const COPY_TYPE = "copy";
export const COPY_CHILD_TYPE = "copy_child";
export const ADD_METADATA_TYPE = "add_metadata";
const stat = promisify(fsStat);

interface CreateJobRequestWithJobId extends CreateJobRequest {
  jobId: string;
}

const getUUID = (): string => {
  // JSS does not allow hyphenated GUIDS.
  return uuid.v1().replace(/-/g, "");
};

/**
 * This class is responsible for uploading files through FSS.
 */
export class Uploader {
  private readonly fss: FSSConnection;
  private readonly jss: JobStatusClient;
  private readonly username: string = userInfo().username;
  private readonly logger: ILogger;
  private readonly defaultJobInfo = {
    currentHost: hostname(),
    originationHost: hostname(),
    service: "aicsfiles-js",
    status: "WAITING" as JSSJobStatus,
    updateParent: true,
    user: this.username,
  };
  public defaultMountPoint = "/allen/aics"; // leaving this editable for testing purposes
  public mountPoint: string = makePosixPathCompatibleWithPlatform(
    this.defaultMountPoint,
    platform()
  );

  public constructor(
    fss: FSSConnection,
    jobStatusClient: JobStatusClient,
    logger: ILogger = Logger.get(AICSFILES_LOGGER)
  ) {
    this.fss = fss;
    this.jss = jobStatusClient;
    this.logger = logger;
  }

  private async executeSteps(
    ctx: UploadContext,
    steps: Step[]
  ): Promise<UploadResponse> {
    // Fix the upload directory for users who have a non-standard a mount point (such as those with Macs)
    ctx.startUploadResponse.uploadDirectory = ctx.startUploadResponse.uploadDirectory.replace(
      this.defaultMountPoint,
      this.mountPoint
    );

    const updatedCtx = await StepExecutor.executeSteps(this.jss, steps, ctx);

    // Converts an array of files to an object where the keys are the fileName and the values are the file
    return this.mapToResponse(updatedCtx.resultFiles || []);
  }

  public async uploadFiles(
    startUploadResponse: StartUploadResponse,
    uploads: Uploads,
    uploadJobName: string,
    copyProgressCb: (
      originalFilePath: string,
      bytesCopied: number,
      totalBytes: number
    ) => void = noop,
    copyProgressCbThrottleMs?: number
  ): Promise<UploadResponse> {
    const { ctx, jobs: childJobs } = await this.getUploadChildJobs({
      startUploadResponse,
      uploads,
      uploadJobName,
    });
    const steps: Step[] = await this.getSteps(
      childJobs,
      copyProgressCb,
      copyProgressCbThrottleMs
    );

    return this.executeSteps(ctx, steps);
  }

  /**
   * Uploads files through FSS.
   * @param uploads a map of local file paths and metadata
   * @param uploadJob Job to retry
   * @param copyProgressCb callback on copy progress
   * @param copyProgressCbThrottleMs minimum amount of ms between calls to copyProgressCb
   */
  public async retryUpload(
    uploads: Uploads,
    uploadJob: JSSJob,
    copyProgressCb: (
      originalFilePath: string,
      bytesCopied: number,
      totalBytes: number
    ) => void = noop,
    copyProgressCbThrottleMs?: number
  ): Promise<UploadResponse> {
    this.validateUploadJob(uploadJob);

    if (uploadJob.status === "SUCCEEDED") {
      // if upload job already succeeded, we'll just return what is stored as output on the job
      return uploadJob.serviceFields?.output ?? {};
    }

    await this.jss.updateJob(uploadJob.jobId, {
      status: "RETRYING",
    });

    const originalUploadResponse: StartUploadResponse = {
      jobId: uploadJob.jobId,
      uploadDirectory: uploadJob.serviceFields.uploadDirectory,
    };
    const uploadJobName = uploadJob.jobName || "default upload name";

    const { ctx, jobs: childJobs } = await this.getUploadChildJobs({
      startUploadResponse: originalUploadResponse,
      uploads,
      uploadJobName,
      uploadJob,
    });

    const steps: Step[] = await this.getSteps(
      childJobs,
      copyProgressCb,
      copyProgressCbThrottleMs
    );
    const jobCompleted = steps.every(
      ({ job: { status }, name }) =>
        status === "SUCCEEDED" || name === StepName.AddMetadata
    );

    if (jobCompleted && uploadJob.status === "FAILED") {
      this.logger.info(
        "Current upload failed too late in the process to retry, replacing with new job"
      );
      // Start new upload job that will replace the current one
      const newUploadResponse = await this.fss.startUpload(
        uploads,
        uploadJobName
      );
      // Update the current job with information about the replacement
      await this.jss.updateJob(
        uploadJob.jobId,
        {
          serviceFields: {
            error: `This job has been replaced with Job ID: ${newUploadResponse.jobId}`,
            replacementJobId: newUploadResponse.jobId,
          },
        },
        true
      );
      // Perform upload with new job and current job's metadata, forgoing the current job
      return this.uploadFiles(newUploadResponse, uploads, uploadJobName);
    }

    return this.executeSteps(ctx, steps);
  }

  private validateUploadJob(job: JSSJob): void {
    if (
      includes(["UNRECOVERABLE", "WORKING", "RETRYING", "BLOCKED"], job.status)
    ) {
      throw new Error(
        `Can't retry this upload job because the status is ${job.status}.`
      );
    }

    if (!job.serviceFields.uploadDirectory) {
      throw new UnrecoverableJobError(
        "Upload job is missing serviceFields.uploadDirectory"
      );
    }
  }

  private async getUploadChildJobs(
    ctx: UploadContext
  ): Promise<{ jobs: Promise<Job[]>; ctx: UploadContext }> {
    if (ctx.uploadJob) {
      this.logger.info("Getting existing upload jobs");
      return this.getExistingUploadJobs(ctx);
    }

    this.logger.info("Creating upload jobs");
    return this.createUploadJobs(ctx);
  }

  private async getExistingUploadJobs(
    ctx: UploadContext
  ): Promise<{ jobs: Promise<Job[]>; ctx: UploadContext }> {
    const { uploadJob, uploads } = ctx;
    if (!uploadJob) {
      throw new Error("No upload job provided");
    }

    if (!uploadJob.childIds || uploadJob.childIds.length === 0) {
      this.logger.warn(
        "Upload job provided does not include childIds - creating child jobs"
      );
      return this.createUploadJobs(ctx);
    }

    if (uploadJob.childIds.length !== EXPECTED_NUMBER_UPLOAD_STEPS) {
      throw new UnrecoverableJobError(
        `Expected ${EXPECTED_NUMBER_UPLOAD_STEPS} childIds on uploadJob but got: ${uploadJob.childIds.length}`
      );
    }

    const childJobsPromise: Promise<JSSJob[]> = this.jss.getJobs({
      jobId: {
        $in: uploadJob.childIds,
      },
      user: this.username,
    });

    const childCopyJobsPromise: Promise<Job[]> = childJobsPromise
      .then((jobs) => {
        if (jobs.length !== EXPECTED_NUMBER_UPLOAD_STEPS) {
          throw new UnrecoverableJobError(
            `Was expecting to retrieve ${EXPECTED_NUMBER_UPLOAD_STEPS} child steps for upload. Retrieved ${jobs.length}.`
          );
        }

        const copyJob = jobs.find(
          (j) => j.serviceFields && j.serviceFields.type === COPY_TYPE
        );
        if (!copyJob) {
          throw new UnrecoverableJobError(
            "Could not find the parent copy job."
          );
        }
        return this.jss
          .getJobs({
            jobId: {
              $in: copyJob.childIds,
            },
            user: this.username,
          })
          .then((copyChildJobs) => {
            const expectedNumberCopyChildJobs = keys(uploads).length;
            if (copyChildJobs.length !== expectedNumberCopyChildJobs) {
              throw new UnrecoverableJobError(
                `Was expecting to retrieve ${expectedNumberCopyChildJobs} but instead retrieved ${copyChildJobs.length}`
              );
            }
            if (
              copyChildJobs.find(
                (j) => !j.serviceFields || !j.serviceFields.originalPath
              )
            ) {
              throw new UnrecoverableJobError(
                `One or more copy child jobs are missing originalPath`
              );
            }
            return copyChildJobs.map((j) =>
              pick(j, ["jobId", "status", "serviceFields"])
            );
          });
      })
      .catch((e: AxiosError) => {
        const childIds = uploadJob.childIds || [];
        const error = `Failed to get upload job children: ${childIds.join(
          ", "
        )}`;
        this.logger.error(error, e.response);
        throw e;
      });

    const fileToSizeMap = await this.getFileSizes(uploads);
    return {
      ctx: {
        ...ctx,
        copyChildJobs: await childCopyJobsPromise,
        totalBytesToCopy: this.getTotalBytesToCopy(fileToSizeMap),
        uploadChildJobIds: uploadJob.childIds,
      },
      jobs: childJobsPromise,
    };
  }

  private async getFileSizes(uploads: Uploads): Promise<Map<string, number>> {
    const fileToSizeMap = new Map();
    for (const [filePath] of Object.entries(uploads)) {
      const stats = await stat(filePath);
      fileToSizeMap.set(filePath, stats.size);
    }
    return fileToSizeMap;
  }
  private getTotalBytesToCopy(fileToSizeMap: Map<string, number>): number {
    return [...fileToSizeMap.values()].reduce(
      (byteCount: number, size: number) => byteCount + size,
      0
    );
  }

  private async createUploadJobs(
    ctx: UploadContext
  ): Promise<{ jobs: Promise<Job[]>; ctx: UploadContext }> {
    const { startUploadResponse, uploads } = ctx;
    const parentId = startUploadResponse.jobId;
    const uploadChildJobIds = [getUUID(), getUUID()];
    const fileToSizeMap = await this.getFileSizes(uploads);
    const totalBytesToCopy = this.getTotalBytesToCopy(fileToSizeMap);
    const createUploadChildJobRequests: CreateJobRequestWithJobId[] = [
      {
        ...this.defaultJobInfo,
        jobId: uploadChildJobIds[0],
        jobName: "Copy job parent",
        parentId,
        serviceFields: {
          totalBytesToCopy,
          type: COPY_TYPE,
        },
        updateParent: false,
      },
      {
        ...this.defaultJobInfo,
        jobId: uploadChildJobIds[1],
        jobName: "Tell FSS that copy is complete",
        parentId,
        serviceFields: {
          type: ADD_METADATA_TYPE,
        },
        updateParent: false,
      },
    ];

    await Promise.all(
      createUploadChildJobRequests.map((r) => this.jss.createJob(r))
    ).catch((e: AxiosError) => {
      const error = `Failed to create child upload job`;
      this.logger.error(error, e.response);
      throw new Error(error);
    });
    return {
      ctx: {
        ...ctx,
        copyChildJobs: await this.createCopyJobs(
          uploads,
          uploadChildJobIds[0],
          fileToSizeMap
        ),
        totalBytesToCopy,
        uploadChildJobIds: uploadChildJobIds,
      },
      jobs: Promise.resolve(
        createUploadChildJobRequests.map((r) =>
          pick(r, ["status", "serviceFields", "jobId"])
        )
      ),
    };
  }

  private async createCopyJobs(
    uploads: Uploads,
    parentCopyJobId: string,
    fileToSizeMap: Map<string, number>
  ): Promise<Job[]> {
    const copyJobs = keys(uploads).map((originalPath: string) => {
      const jobId = getUUID();
      return {
        jobId,
        serviceFields: { originalPath },
        status: "WAITING" as JSSJobStatus,
      };
    });

    await Promise.all(
      copyJobs.map((job: Job) =>
        this.jss.createJob({
          ...this.defaultJobInfo,
          ...job,
          jobName: getCopyChildJobName(job.serviceFields.originalPath),
          parentId: parentCopyJobId,
          serviceFields: {
            ...job.serviceFields,
            totalBytes: fileToSizeMap.get(job.serviceFields.originalPath),
            type: COPY_CHILD_TYPE,
          },
          updateParent: true,
        })
      )
    ).catch((e: AxiosError) => {
      const error = "Could not create copy child jobs!";
      this.logger.error(error, e.response);
      throw new Error("Could not create copy child jobs!");
    });

    return copyJobs;
  }

  private async getSteps(
    jobsPromise: Promise<Job[]>,
    copyProgressCb: (
      originalFilePath: string,
      bytesCopied: number,
      totalBytes: number
    ) => void = noop,
    copyProgressCbThrottleMs?: number
  ): Promise<Step[]> {
    const jobs = await jobsPromise;
    if (jobs.length !== EXPECTED_NUMBER_UPLOAD_STEPS) {
      throw new Error(`Unexpected number of child jobs: ${jobs.length}`);
    }

    return [
      new CopyFilesStep(
        jobs[0],
        this.jss,
        this.logger,
        undefined,
        copyProgressCb,
        copyProgressCbThrottleMs
      ),
      new AddMetadataStep(jobs[1], this.fss, this.jss, this.logger),
    ];
  }

  private mapToResponse(files: FSSResponseFile[]): UploadResponse {
    return files.reduce(
      (accum: { [id: string]: FSSResponseFile }, curr: FSSResponseFile) => ({
        ...accum,
        [curr.fileName]: curr,
      }),
      {}
    );
  }
}

import axios, { AxiosRequestConfig } from "axios";
import { camelizeKeys } from "humps";
import { castArray } from "lodash";

import { LocalStorage } from "../../types";
import { FileType } from "../../util";
import HttpCacheClient from "../http-cache-client";
import { JSSJob } from "../job-status-service/types";
import { HttpClient } from "../types";

export interface FSSUpload extends JSSJob {
  serviceFields: {
    fileId?: string;
    fileSize?: number;
    copyToFmsCacheProgress?: number; // hybrid only
    checksumProgress?: number; // cloud + hybrid
    s3UploadProgress?: number; // final stage
    multifile?: boolean;
  };
}

/**
 * Values for UploadStatus are defined by FSS2 (ClientUploadStatus): https://github.com/aics-int/file-storage-service/blob/main/src/main/java/org/alleninstitute/aics/fss/model/status/UploadStatus.java#L427
 */
export enum UploadStatus {
  COMPLETE = "COMPLETE",
  WORKING = "WORKING", // Upload is in progress and accepting chunks.
  INACTIVE = "INACTIVE", // Upload was either cancelled, expired, or failed.
  RETRY = "RETRY", // Upload experienced a recoverable error, and can resume when /upload/retry is called.
  POST_PROCESSING = "POST_PROCESSING", // Chunks were all recieved, /finalize was called, and post upload processing is happening.
}

export interface UploadStatusResponse {
  fileId: string;
  status: UploadStatus;
  uploadId: string;
}

interface FileRecord {
  cloudPath?: string;
  fileId: string;
  name: string;
  size: number;
  localPath: string;
  md5: string;
}

/**
 * This acts as an interface for interacting with the File Storage Service (FSS).
 */
export default class FileStorageService extends HttpCacheClient {
  public static readonly ENDPOINT_V4 = "fss2/v4.0";
  public static readonly ENDPOINT_V3 = "fss2/v3.0";
  private static readonly BASE_FILE_PATH = `${FileStorageService.ENDPOINT_V3}/file`;
  private static readonly BASE_UPLOAD_PATH = `${FileStorageService.ENDPOINT_V4}/upload`;
  constructor(httpClient: HttpClient, localStorage: LocalStorage) {
    super(httpClient, localStorage, false);
  }

  public async fileExistsByNameAndSize(
    name: string,
    size: number
  ): Promise<boolean> {
    const url = `${FileStorageService.BASE_FILE_PATH}?name=${name}&size=${size}`;
    try {
      await this.get<FileRecord>(url);
      return true;
    } catch (error) {
      if (error.response.status === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * FSS v4: Create a new upload.
   * This replaces registerUpload and chunked upload logic from v3.
   */
  public upload(
    fileName: string,
    fileType: FileType,
    path: string,
    source = "VAST", // hardcoded for now
    isMultifile?: boolean,
    shouldBeInLocal?: boolean
  ): Promise<UploadStatusResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}`;
    const postBody = {
      fileName,
      fileType,
      source,
      path,
      multifile: isMultifile ?? false,
      shouldBeInLocal,
    };
    return this.post<UploadStatusResponse>(
      url,
      postBody,
      FileStorageService.getHttpRequestConfig()
    );
  }

  /**
   * Retry a failed or canceled upload (FSS v4).
   */
  public retryUpload(uploadId: string): Promise<UploadStatusResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/${uploadId}/retry`;
    return this.put<UploadStatusResponse>(
      url,
      undefined,
      FileStorageService.getHttpRequestConfig()
    );
  }

  /**
   * This cancels the upload if it exists and can be canceled from the
   * service's perspective.
   */
  public cancelUpload(uploadId: string): Promise<UploadStatusResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/${uploadId}/cancel`;
    return this.put<UploadStatusResponse>(
      url,
      undefined,
      FileStorageService.getHttpRequestConfig()
    );
  }

  /**
   * Returns the status of the upload, useful for determining how far
   * along an upload is and/or if it is in progress.
   */
  public getStatus(uploadId: string): Promise<UploadStatusResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/${uploadId}`;
    return this.get<UploadStatusResponse>(url);
  }

  /**
   * Returns the basic attributes of a file such as its stored location.
   */
  public getFileAttributes(fileId: string): Promise<FileRecord> {
    const url = `${FileStorageService.BASE_FILE_PATH}/${fileId}`;
    return this.get<FileRecord>(url);
  }

  // FSS returns responses in snake_case format
  private static getHttpRequestConfig(): AxiosRequestConfig {
    return {
      transformResponse: [
        ...castArray(axios.defaults.transformResponse),
        (data) => camelizeKeys(data),
      ],
    };
  }
}

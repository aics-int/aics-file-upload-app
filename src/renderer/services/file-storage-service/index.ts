import axios, { AxiosRequestConfig } from "axios";
import { camelizeKeys } from "humps";
import { castArray } from "lodash";

import { LocalStorage } from "../../types";
import HttpCacheClient from "../http-cache-client";
import { HttpClient } from "../types";

export enum UploadStatus {
  WORKING = "WORKING", // as expected, in process
  FAILED = "FAILED", // software failure
  COMPLETE = "COMPLETE",
  CANCELLED = "CANCELLED", // user cancelled
  EXPIRED = "EXPIRED", // too long since last activity
}

export enum ChunkStatus {
  ALLOCATED = "Allocated",
  WORKING = "Working",
  FAILED = "Failed",
  COMPLETE = "Complete",
}

// RESPONSE TYPES
interface RegisterUploadResponse {
  uploadId: string; // ID for tracking upload
  chunkSize: number; // Size of chunks to send to service
}

// Receipt of chunk submission
interface UploadChunkResponse {
  chunkNumber: number;
  fileId?: string;
  uploadId: string;
}

export interface UploadStatusResponse {
  chunkSize?: number; // TODO: Not in the FSS2 model yet, adding ahead of time as an optional field
  chunkStatuses: ChunkStatus[];
  uploadStatus: UploadStatus;
}

interface FileRecord {
  addedToLabkey: boolean;
  archivePath?: string;
  cloudPath?: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  localPath: string;
  md5: string;
}

/**
 * This acts as an interface for interacting with the File Storage Service (FSS).
 */
export default class FileStorageService extends HttpCacheClient {
  private static readonly ENDPOINT = "fss/2.0";
  private static readonly BASE_FILE_PATH = `${FileStorageService.ENDPOINT}/file`;
  private static readonly BASE_UPLOAD_PATH = `${FileStorageService.ENDPOINT}/upload`;

  constructor(httpClient: HttpClient, localStorage: LocalStorage) {
    super(httpClient, localStorage, false, "http", "dev-aics-chp-002", 8080);
  }

  /**
   * This is the first step to an upload. Before the app can start sending
   * chunks of the file to upload it must first make the service aware of the
   * file itself.
   */
  public registerUpload(
    fileName: string,
    fileSize: number,
    md5: string
  ): Promise<RegisterUploadResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/registerUpload`;
    const postBody = {
      // Unfortunately FSS expects snake_case in all but one case (MD5)
      // so the conversion must be manual each request
      // eslint-disable-next-line @typescript-eslint/camelcase
      file_name: fileName,
      // Unfortunately FSS expects snake_case in all but one case (MD5)
      // so the conversion must be manual each request
      // eslint-disable-next-line @typescript-eslint/camelcase
      file_size: fileSize,
      MD5: md5,
    };
    return this.post<RegisterUploadResponse>(
      url,
      postBody,
      FileStorageService.getHttpRequestConfig()
    );
  }

  /**
   * This is an incremental upload act, after an upload has been registered
   * the file can be send in chunked of pretermined size to the service.
   */
  public sendUploadChunk(
    uploadId: string,
    chunkNumber: number,
    rangeStart: number,
    postBody: Uint8Array
  ): Promise<UploadChunkResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/uploadChunk/${uploadId}/${chunkNumber}`;
    const rangeEnd = rangeStart + postBody.byteLength - 1;
    return this.post<UploadChunkResponse>(url, postBody, {
      ...FileStorageService.getHttpRequestConfig(),
      headers: {
        "Content-Type": "application/octet-stream",
        range: `bytes=${rangeStart}-${rangeEnd}`,
        "X-User-Id": "seanm", // TODO Revert: username,
      },
    });
  }

  /**
   * This is the final step to an upload. However, normally this is automatically
   * performed by the service, this method need only be called for upload that have
   * failed to finalize themselves.
   */
  public repeatFinalize(uploadId: string): Promise<UploadChunkResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/finalize/${uploadId}`;
    return this.patch<UploadChunkResponse>(url, undefined);
  }

  /**
   * This cancels the upload if it exists and can be canceled from the
   * service's perspective.
   */
  public cancelUpload(uploadId: string): Promise<UploadStatusResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/${uploadId}`;
    return this.delete<UploadStatusResponse>(url, undefined);
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

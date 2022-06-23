import axios, { AxiosRequestConfig } from "axios";
import { camelizeKeys } from "humps";
import { castArray } from "lodash";

import { LocalStorage } from "../../types";
import { FileType } from "../../util";
import HttpCacheClient from "../http-cache-client";
import { JSSJob, JSSJobStatus } from "../job-status-service/types";
import { HttpClient } from "../types";

interface FSSServiceField {
  status: JSSJobStatus;
  statusDetail?: string;
}

export interface FSSUpload extends JSSJob {
  serviceFields: {
    addedToLabkey?: FSSServiceField;
    publishedToSns?: FSSServiceField;
    fileId?: string;
  };
}

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

export enum UploadStage {
  WAITING_FOR_FIRST_CHUNK = "WAITING_FOR_FIRST_CHUNK",
  ADDING_CHUNKS = "ADDING_CHUNKS",
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
  public static readonly ENDPOINT = "fss2/v3.0";
  private static readonly BASE_FILE_PATH = `${FileStorageService.ENDPOINT}/file`;
  private static readonly BASE_UPLOAD_PATH = `${FileStorageService.ENDPOINT}/upload`;
  constructor(httpClient: HttpClient, localStorage: LocalStorage) {
    super(httpClient, localStorage, false);
  }

  public async fileExistsByNameAndSize(
    name: string,
    size: number
  ): Promise<boolean> {
    const url = `${FileStorageService.BASE_FILE_PATH}?name=${name}&size=${size}`;
    const fileRecords = await this.get<FileRecord[]>(url);
    return fileRecords.length !== 0;
  }

  /**
   * This is the first step to an upload. Before the app can start sending
   * chunks of the file to upload it must first make the service aware of the
   * file itself.
   */
  public registerUpload(
    fileName: string,
    fileType: FileType,
    fileSize: number,
    md5: string
  ): Promise<RegisterUploadResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/register`;
    const postBody = {
      // Unfortunately FSS expects snake_case in all but one case (MD5)
      // so the conversion must be manual each request
      file_name: fileName,
      file_type: fileType,
      // Unfortunately FSS expects snake_case in all but one case (MD5)
      // so the conversion must be manual each request
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
    postBody: Uint8Array,
    user: string
  ): Promise<UploadChunkResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/${uploadId}/chunk/${chunkNumber}`;
    const rangeEnd = rangeStart + postBody.byteLength - 1;
    return this.post<UploadChunkResponse>(url, postBody, {
      ...FileStorageService.getHttpRequestConfig(),
      headers: {
        "Content-Type": "application/octet-stream",
        Range: `bytes=${rangeStart}-${rangeEnd}`,
        "X-User-Id": user,
      },
    });
  }

  /**
   * This is the final step to an upload. However, normally this is automatically
   * performed by the service, this method need only be called for upload that have
   * failed to finalize themselves.
   */
  public finalize(uploadId: string): Promise<UploadChunkResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/${uploadId}/finalize`;
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

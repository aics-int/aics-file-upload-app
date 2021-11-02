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
  chunkSize?: number; // Not in the FSS2 model yet, adding ahead of time as an optional field
  chunkStatuses: ChunkStatus[];
  uploadStatus: UploadStatus;
}

interface FileRecord {
  addedToLabkey: boolean;
  archivePath: string;
  cloudPath: string;
  fileId: string;
  fileName: string;
  fileSize: number;
  localPath: string;
  md5: string;
}

/**
 * TODO
 */
export default class FileStorageClient extends HttpCacheClient {
  private static readonly ENDPOINT = "fss2/2.0";
  private static readonly BASE_FILE_PATH = `${FileStorageClient.ENDPOINT}/file`;
  private static readonly BASE_UPLOAD_PATH = `${FileStorageClient.ENDPOINT}/upload`;

  constructor(httpClient: HttpClient, localStorage: LocalStorage) {
    super(httpClient, localStorage, false, "https");
  }

  public registerUpload(
    fileName: string,
    fileSize: number,
    md5: string
  ): Promise<RegisterUploadResponse> {
    const url = `${FileStorageClient.BASE_UPLOAD_PATH}/registerUpload`;
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
      FileStorageClient.getHttpRequestConfig()
    );
  }

  public sendUploadChunk(
    uploadId: string,
    chunkSize: number,
    chunkNumber: number,
    postBody: Uint8Array
  ): Promise<UploadChunkResponse> {
    const url = `${FileStorageClient.BASE_UPLOAD_PATH}/uploadChunk/${uploadId}/${chunkNumber}`;
    const rangeStart = (chunkNumber - 1) * chunkSize;
    const rangeEnd = rangeStart + postBody.byteLength - 1;
    return this.post<UploadChunkResponse>(url, postBody, {
      ...FileStorageClient.getHttpRequestConfig(),
      headers: {
        ...this.getHttpRequestConfig().headers,
        range: `bytes=${rangeStart}-${rangeEnd}`,
      },
    });
  }

  public cancelUpload(uploadId: string): Promise<UploadStatusResponse> {
    const url = `${FileStorageClient.BASE_UPLOAD_PATH}/${uploadId}`;
    return this.delete<UploadStatusResponse>(url, undefined);
  }

  public getStatus(uploadId: string): Promise<UploadStatusResponse> {
    const url = `${FileStorageClient.BASE_UPLOAD_PATH}/${uploadId}`;
    return this.get<UploadStatusResponse>(url);
  }

  public getFileAttributes(fileId: string): Promise<FileRecord> {
    const url = `${FileStorageClient.BASE_FILE_PATH}/${fileId}`;
    return this.get<FileRecord>(url);
  }

  public repeatFinalize(uploadId: string): Promise<UploadChunkResponse> {
    const url = `${FileStorageClient.BASE_UPLOAD_PATH}/finalize/${uploadId}`;
    return this.patch<UploadChunkResponse>(url, undefined);
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

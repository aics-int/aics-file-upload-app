import { LocalStorage } from "../../types";
import HttpCacheClient from "../http-cache-client";
import { AicsSuccessResponse, HttpClient, UploadRequest } from "../types";

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

// Request Types
export interface FSSRequestFile {
  fileName: string;
  md5hex: string;
  fileType: string;
  metadata: UploadRequest;
  shouldBeInArchive?: boolean;
  shouldBeInLocal?: boolean;
}

// RESPONSE TYPES

interface RegisterUploadResponse {
  uploadId: string; // ID for tracking upload
  chunkSize: number; // Size of chunks to send to service
}

// Receipt of chunk submission
interface UploadChunkResponse {
  chunkNumber: number;
  fileId: string;
  uploadId: string;
  errorCount: number; // TODO: why is this ever non-zero?
}

export interface UploadStatusResponse {
  chunkSize?: number; // Not in the FSS2 model yet, adding ahead of time as an optional field
  chunkStatuses: ChunkStatus[];
  uploadStatus: UploadStatus;
}

/**
 * TODO
 */
export default class FileStorageClient extends HttpCacheClient {
  private static readonly ENDPOINT = "file-storage-service/2.0/upload";

  constructor(httpClient: HttpClient, localStorage: LocalStorage) {
    super(httpClient, localStorage, false);
  }

  public async registerUpload(
    fileName: string,
    fileSize: number,
    md5: string
  ): Promise<RegisterUploadResponse> {
    const url = `${FileStorageClient.ENDPOINT}/registerUpload`;
    const postBody = {
      fileName,
      fileSize,
      md5,
    };
    const response = await this.post<
      AicsSuccessResponse<RegisterUploadResponse>
    >(url, postBody);
    return response.data[0];
  }

  public async sendUploadChunk(
    uploadId: string,
    chunkNumber: number,
    postBody: string
  ) {
    const url = `${FileStorageClient.ENDPOINT}/uploadChunk/${uploadId}/${chunkNumber}`;
    const response = await this.post<AicsSuccessResponse<UploadChunkResponse>>(
      url,
      postBody
    );
    // TODO:????
    if (response.data[0].errorCount > 0) {
      throw new Error("What?????");
    }
  }

  public async cancelUpload(uploadId: string) {
    const url = `${FileStorageClient.ENDPOINT}/${uploadId}`;
    await this.delete<AicsSuccessResponse<UploadStatusResponse>>(
      url,
      undefined
    );
  }

  public async getStatus(uploadId: string): Promise<UploadStatusResponse> {
    const url = `${FileStorageClient.ENDPOINT}/${uploadId}`;
    const response = await this.delete<
      AicsSuccessResponse<UploadStatusResponse>
    >(url, undefined);
    return response.data[0];
  }

  // TODO: What is this...?
  public async repeatFinalize(uploadId: string): Promise<void> {
    const url = `${FileStorageClient.ENDPOINT}/finalize/${uploadId}`;
    await this.patch<AicsSuccessResponse<UploadChunkResponse>>(url, undefined);
  }
}

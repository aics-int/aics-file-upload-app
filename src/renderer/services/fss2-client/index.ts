import { LocalStorage } from "../../types";
import HttpCacheClient from "../http-cache-client";
import { AicsSuccessResponse, HttpClient, UploadRequest } from "../types";

enum UploadStatus {
  WORKING = "WORKING", // as expected, in process
  FAILED = "FAILED", // software failure
  COMPLETE = "COMPLETE",
  CANCELLED = "CANCELLED", // user cancelled
  EXPIRED = "EXPIRED", // too long since last activity
}

enum ChunkStatus {
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

interface UploadStatusResponse {
  uploadStatus: UploadStatus;
  chunkStatuses: ChunkStatus[];
}

/**
 * TODO
 */
export default class FileStorageClient2 extends HttpCacheClient {
  private static readonly ENDPOINT = "file-storage-service/2.0/upload";

  constructor(httpClient: HttpClient, localStorage: LocalStorage) {
    super(httpClient, localStorage, false);
  }

  public async registerUpload(
    fileName: string,
    fileSize: number,
    md5: string
  ): Promise<RegisterUploadResponse> {
    const url = `${FileStorageClient2.ENDPOINT}/registerUpload`;
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
    postBody: byte[]
  ) {
    const url = `${FileStorageClient2.ENDPOINT}/uploadChunk/${uploadId}/${chunkNumber}`;
    const response = await this.post<AicsSuccessResponse<UploadChunkResponse>>(
      url,
      postBody
    );
    if (response.data[0].errorCount > 0) {
      throw new Error("What?????");
    }
  }

  public async cancelUpload(uploadId: string) {
    const url = `${FileStorageClient2.ENDPOINT}/${uploadId}`;
    await this.delete<AicsSuccessResponse<UploadStatusResponse>>(
      url,
      undefined
    );
  }

  public async getStatus(uploadId: string): Promise<UploadStatusResponse> {
    const url = `${FileStorageClient2.ENDPOINT}/${uploadId}`;
    const response = await this.delete<
      AicsSuccessResponse<UploadStatusResponse>
    >(url, undefined);
    return response.data[0];
  }

  // TODO: What is this...?
  public async repeatFinalize(uploadId: string) {
    const url = `${FileStorageClient2.ENDPOINT}/finalize/${uploadId}`;
    const response = await this.patch<AicsSuccessResponse<UploadChunkResponse>>(
      url,
      undefined
    );
  }
}

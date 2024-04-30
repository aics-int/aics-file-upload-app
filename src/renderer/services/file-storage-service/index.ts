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
    preUploadMd5?: number;
    postUploadMd5?: number;
    fileSize?: number;
    currentFileSize?: number;
    multifile?: boolean;
    subfiles?: object
  };
}

/**
 * Values for UploadStatus are defined by FSS2 (ClientUploadStatus): https://github.com/aics-int/file-storage-service/blob/main/src/main/java/org/alleninstitute/aics/fss/model/status/UploadStatus.java#L427
 */
export enum UploadStatus {
  COMPLETE = "COMPLETE",
  WORKING = "WORKING",                  // Upload is in progress and accepting chunks.
  INACTIVE = "INACTIVE",                // Upload was either cancelled, expired, or failed.
  RETRY = "RETRY",                      // Upload experienced a recoverable error, and can resume when /upload/retry is called.
  POST_PROCESSING = "POST_PROCESSING"   // Chunks were all recieved, /finalize was called, and post upload processing is happening.  
}

// RESPONSE TYPES

// Receipt of chunk submission
interface UploadChunkResponse {
  chunkNumber: number;
  errorCount: number;
  uploadId: string;
}

interface ChunkInfoResponse {
  cumulativeMD5?: string;
  size: number;
  status: UploadStatus;
}

export interface UploadStatusResponse {
  chunkSize: number;
  chunkStatuses: UploadStatus[];
  currentFileSize: number;
  fileSize: number;
  fileId?: string;
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
    try{
      await this.get<FileRecord>(url);
      return true;
    } catch (error){
      if(error.response.status === 404){
        return false;
      }
      throw error;
    }

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
    localNasPath?: string,
    isMultifile?: boolean,
  ): Promise<UploadStatusResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/register`;
    const postBody = {
      // Unfortunately FSS expects snake_case
      // so the conversion must be manual each request
      file_name: fileName,
      file_type: fileType,
      // Unfortunately FSS expects snake_case
      // so the conversion must be manual each request
      file_size: fileSize,
      local_nas_shortcut: localNasPath !== undefined,
      local_nas_path: localNasPath,
      multifile: !!isMultifile,
    };
    return this.post<UploadStatusResponse>(
      url,
      postBody,
      FileStorageService.getHttpRequestConfig()
    );
  }

  /**
   * This is an incremental upload act, after an upload has been registered
   * the file can be send in chunked of pretermined size to the service.
   */
  public async sendUploadChunk(
    uploadId: string,
    chunkNumber: number,
    rangeStart: number,
    md5ThusFar: string,
    postBody: Uint8Array,
    user: string
  ): Promise<void> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/${uploadId}/chunk/${chunkNumber}`;
    const rangeEnd = rangeStart + postBody.byteLength - 1;
    const attemptRequest = () => (
      this.post<UploadChunkResponse>(url, postBody, {
        ...FileStorageService.getHttpRequestConfig(),
        headers: {
          "Content-Type": "application/octet-stream",
          "Cumulative-MD5": md5ThusFar,
          Range: `bytes=${rangeStart}-${rangeEnd}`,
          "X-User-Id": user,
        },
      }
      )
    );
    try {
      await attemptRequest();
    } catch (error) {
      // Re-throw error if status can't be determine (like when the error doesn't have to do with the server/HTTP request
      // or if the status is between acceptable ranges indicating another problem is afoot
      if (!error.response || !error.response.status || (error.response.status >= 200 && error.response.status < 300)) {
        throw error;
      }

      // Currently there are infrastructure performance bottlenecks that cause the upload chunk endpoint
      // to timeout unexpectedly. In this case this client needs to be robust
      // enough to wait to see what ended up happening the chunk (within a reasonable timeframe)
      // Additionally, this includes a feature to auto-retry chunks that are determined to need it
      for (let statusCheckAttemptNumber = 0; statusCheckAttemptNumber < 8; statusCheckAttemptNumber++) {
        // Geometric backoff up to 15 minutes
        await new Promise((resolve) => setTimeout(resolve, statusCheckAttemptNumber * 30 * 1000))

        const { chunkStatuses } = await this.getStatus(uploadId);
        const chunkStatusForThisChunk = chunkStatuses[chunkNumber - 1];
        if (chunkStatusForThisChunk === UploadStatus.INACTIVE) {
          throw new Error(
              `Something went wrong uploading chunk number ${chunkNumber} for upload ${uploadId}. ` +
              "Chunk was determined to have failed uploading."
          )
        } else if (chunkStatusForThisChunk === UploadStatus.COMPLETE) {
          return;
        } else if (chunkStatusForThisChunk === UploadStatus.RETRY) {
          try {
            await attemptRequest();
            return;
          } catch (error) {
            // no-op, continue loop
          }
        }
      }
  
      throw new Error(
        `Timed out while waiting for chunk ${chunkNumber} to upload`
      );
    }
  }

  /**
   * This is the final step to an upload.  The MD5 is included, and will be used by the server for a checksum.
   * Other post upload tasks may also occur.
   */
  public finalize(uploadId: string, md5: string): Promise<UploadChunkResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/${uploadId}/finalize?md5=${md5}`;
    return this.patch<UploadChunkResponse>(url, undefined);
  }

  /**
   * This is a retry of the final asynchronous step of the upload, this might be necessary in cases where something goes awry
   * on the server's side during this step of the upload.
   * The MD5 is included, and will be used by the server for a checksum.
   * Other post upload tasks may also occur.
   */
  public retryFinalizeMd5(uploadId: string, md5?: string): Promise<UploadChunkResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/${uploadId}/finalize?md5=${md5}`;
    return this.patch<UploadChunkResponse>(url, undefined);
  }

  /**
   * This is a retry of the final asynchronous step of the upload, this might be necessary in cases where something goes awry
   * on the server's side during this step of the upload.
   * 
   * This method is meant for locaNasShortcut upload only; MD5 is not included.
   */
  public retryFinalizeForLocalNasShortcutUpload(uploadId: string): Promise<UploadChunkResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/${uploadId}/finalize?localNasShortcut=true`; //TODO SWE-867
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
   * Get information about the specific chunk requested
   */
  public getChunkInfo(uploadId: string, chunkNumber: number): Promise<ChunkInfoResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/${uploadId}/chunk/${chunkNumber}`;
    return this.get<ChunkInfoResponse>(url, undefined);
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

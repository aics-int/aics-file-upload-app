import axios, { AxiosRequestConfig } from "axios";
import { ipcRenderer } from "electron";
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

/**
 * Values for UploadStatus are defined by FSS2 (ClientUploadStatus): https://github.com/aics-int/file-storage-service/blob/main/src/main/java/org/alleninstitute/aics/fss/model/status/UploadStatus.java#L427
 */
export enum UploadStatus {
  COMPLETE = "COMPLETE",
  WORKING = "WORKING",                  //Upload is in progress and accepting chunks.
  INACTIVE = "INACTIVE",                //Upload was either cancelled, expired, or failed.
  RETRY = "RETRY",                      //Upload experienced a recoverable error, and can resume when /upload/retry is called.
  POST_PROCESSING = "POST_PROCESSING"   //Chunks were all recieved, /finalize was called, and post upload processing is happening.  
}

export enum ChunkStatus {
  COMPLETE = "COMPLETE",
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
  ): Promise<RegisterUploadResponse> {
    const url = `${FileStorageService.BASE_UPLOAD_PATH}/register`;
    const postBody = {
      // Unfortunately FSS expects snake_case
      // so the conversion must be manual each request
      file_name: fileName,
      file_type: fileType,
      // Unfortunately FSS expects snake_case
      // so the conversion must be manual each request
      file_size: fileSize,
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
    const url = this.getFullUrl(`${FileStorageService.BASE_UPLOAD_PATH}/${uploadId}/chunk/${chunkNumber}`);
    const rangeEnd = rangeStart + postBody.byteLength - 1;
    console.log("Sending chunk: " + chunkNumber + " to URL: " + url);
    return ipcRenderer.invoke('request', {
      url,
      method: 'POST',
      headers: {
        "Content-Type": "application/octet-stream",
        Range: `bytes=${rangeStart}-${rangeEnd}`,
        "X-User-Id": user,
      },
      data: postBody,
    });
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

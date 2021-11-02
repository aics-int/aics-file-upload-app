import { AxiosRequestConfig } from "axios";

export interface HeaderMap {
  [key: string]: string;
}

export interface AicsResponse {
  responseType: "SUCCESS" | "SERVER_ERROR" | "CLIENT_ERROR";
}

export interface AicsSuccessResponse<T> extends AicsResponse {
  data: T[];
  totalCount: number;
  hasMore?: boolean;
  offset: number;
}

export interface HttpClient {
  get<T = any>(url: string, config?: AxiosRequestConfig): Promise<T>;
  post<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T>;
  put<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T>;
  patch<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T>;
  delete<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T>;
}

export interface FSSResponseFile {
  fileName: string;
  fileId: string;
  readPath: string;
}

interface FileMetadataBlock {
  originalPath: string;
  fileName?: string;
  fileType: string;
  [id: string]: any;
}

export interface ImageModelBase {
  channelId?: string;
  fovId?: number;
  positionIndex?: number;
  scene?: number;
  subImageName?: string;
}

// This is used for the POST request to mms for creating file metadata
export interface MMSFileAnnotation extends ImageModelBase {
  annotationId: number;
  values: string[];
}

// This is used for the POST request to mms for creating file metadata
export interface MMSFile {
  annotations: MMSFileAnnotation[];
  templateId?: number;
}

export interface UploadRequest {
  customMetadata?: MMSFile;
  fileType?: string;
  file: FileMetadataBlock;
  [id: string]: any;
}

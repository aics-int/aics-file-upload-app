import { decamelizeKeys } from "humps";

import { LocalStorage } from "../../types";
import HttpCacheClient from "../http-cache-client";
import { Annotation } from "../labkey-client/types";
import {
  AicsSuccessResponse,
  MMSFile,
  HttpClient,
  UploadRequest,
} from "../types";

import {
  AnnotationMetadataRequest,
  GetPlateResponse,
  SaveTemplateRequest,
  Template,
  WellResponse,
} from "./types";

const mmsURL = "/metadata-management-service";

export default class MetadataManagementService extends HttpCacheClient {
  constructor(
    httpClient: HttpClient,
    localStorage: LocalStorage,
    useCache = false
  ) {
    super(httpClient, localStorage, useCache);
  }
  /**
   * Creates a barcode with a given prefix
   * @param prefixId, the prefixId for the selected prefix to be attached to the barcode
   */
  public async createBarcode(prefixId: number): Promise<string> {
    const url = `${mmsURL}/1.0/plate/barcode`;
    const body = { prefixId, quantity: 1 };
    const response = await this.post(url, body);
    return response.data[0];
  }

  /**
   * Gets plates by barcode and imagingSessionId if provided
   * @param barcode full barcode of plate
   * @param imagingSessionId id of imaging session
   */
  public async getPlate(
    barcode: string,
    imagingSessionId?: number
  ): Promise<GetPlateResponse> {
    let url = `${mmsURL}/1.0/plate/query?barcode=${encodeURIComponent(
      barcode
    )}`;
    if (imagingSessionId) {
      url += `&imagingSessionId=${imagingSessionId}`;
    }
    const response = await this.get(url);
    const { plate, wells } = response.data[0];
    return {
      plate,
      wells: wells.map((w: Partial<WellResponse>) => ({
        ...w,
        plateId: plate.plateId,
      })),
    };
  }

  public async getTemplate(templateId: number): Promise<Template> {
    const url = `${mmsURL}/1.0/template/${templateId}`;
    const response = await this.get(url);
    return response.data[0];
  }

  public async createTemplate(request: SaveTemplateRequest): Promise<number> {
    const url = `${mmsURL}/1.0/template/`;
    const response = await this.post(url, request);
    return response.data[0];
  }

  public async editTemplate(
    request: SaveTemplateRequest,
    templateId: number
  ): Promise<number> {
    const url = `${mmsURL}/1.0/template/${templateId}`;
    const response = await this.put(url, request);
    return response.data[0];
  }

  public async createFileMetadata(
    fileId: string,
    request: UploadRequest
  ): Promise<void> {
    const url = `${mmsURL}/1.0/filemetadata/${fileId}`;
    await this.patch(url, decamelizeKeys(request));
  }

  public async editFileMetadata(
    fileId: string,
    request: UploadRequest
  ): Promise<void> {
    const url = `${mmsURL}/1.0/filemetadata/${fileId}`;
    await this.put(url, decamelizeKeys(request));
  }

  public async deleteFileMetadata(
    fileId: string,
    deleteFile: boolean
  ): Promise<void> {
    const url = `${mmsURL}/1.0/filemetadata/${fileId}`;
    await this.delete(url, { deleteFile });
  }

  public async getFileMetadata(fileId: string): Promise<MMSFile> {
    const url = `${mmsURL}/1.0/filemetadata/${fileId}`;
    const response = await this.get<AicsSuccessResponse<MMSFile>>(url);
    return response.data[0];
  }

  public async createAnnotation(
    annotationRequest: AnnotationMetadataRequest
  ): Promise<Annotation> {
    const url = `${mmsURL}/1.0/annotation/`;
    const response = await this.post<AicsSuccessResponse<Annotation>>(
      url,
      annotationRequest
    );
    return response.data[0];
  }

  public async editAnnotation(
    annotationId: number,
    annotationRequest: AnnotationMetadataRequest
  ): Promise<Annotation> {
    const url = `${mmsURL}/1.0/annotation/${annotationId}`;
    const response = await this.put<AicsSuccessResponse<Annotation>>(
      url,
      annotationRequest
    );
    return response.data[0];
  }
}

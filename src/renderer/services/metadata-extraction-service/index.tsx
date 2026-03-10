import { LocalStorage } from "../../types";
import HttpCacheClient from "../http-cache-client";
import { HttpClient } from "../types";

const mxsURL = "/metadata-extraction-service";

export default class MetadataExtractionService extends HttpCacheClient {
  constructor(
    httpClient: HttpClient,
    localStorage: LocalStorage,
    useCache = false
  ) {
    super(httpClient, localStorage, useCache);
  }
  public async fetchExtractedMetadata(path: string): Promise<MXSResult> {
    const url = `${mxsURL}/extracted-annotations`;
    const response = await this.put(
      url,
      { path: path },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response;
  }
}

export interface MXSResult {
  [annotationName: string]: {
    annotation_id: number;
    value: string | number | boolean | null;
  };
}

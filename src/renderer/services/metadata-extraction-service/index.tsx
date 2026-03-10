import * as path from "path";

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
  public async fetchExtractedMetadata(filePath: string): Promise<MXSResult> {
    const url = `${mxsURL}/extracted-annotations`;
    const posixPath = filePath.split(path.sep).join(path.posix.sep);
    const response = await this.put(
      url,
      { path: posixPath },
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

import { AxiosRequestConfig, AxiosResponse } from "axios";

import {
  DEFAULT_USERNAME,
  LIMS_HOST,
  LIMS_PORT,
  LIMS_PROTOCOL,
  USER_SETTINGS_KEY,
} from "../../../shared/constants";
import { LocalStorage } from "../../types";
import { HttpClient } from "../types";

// TODO: Remove this once we have better typing around user settings
interface LimsSettings {
  limsHost?: string;
  limsPort?: string;
}

export default class HttpCacheClient {
  private httpClient: HttpClient;
  private localStorage: LocalStorage;

  constructor(
    httpClient: HttpClient,
    localStorage: LocalStorage,
    useCache: boolean
  ) {
    this.httpClient = httpClient;
    this.localStorage = localStorage;
    this.get = this.get.bind(this);
    this.post = this.post.bind(this);
    this.put = this.put.bind(this);
    this.patch = this.patch.bind(this);
    this.delete = this.delete.bind(this);

    this.getAndReturnCache = this.getAndReturnCache.bind(this);
    this.postAndReturnCache = this.postAndReturnCache.bind(this);
    this.putAndReturnCache = this.putAndReturnCache.bind(this);
    this.patchAndReturnCache = this.patchAndReturnCache.bind(this);
    this.deleteAndReturnCache = this.deleteAndReturnCache.bind(this);

    if (useCache) {
      this.get = this.getAndReturnCache.bind(this);
      this.post = this.postAndReturnCache.bind(this);
      this.put = this.putAndReturnCache.bind(this);
      this.patch = this.patchAndReturnCache.bind(this);
      this.delete = this.deleteAndReturnCache.bind(this);
    }
  }

  public async get<T = any>(url: string, config?: AxiosRequestConfig) {
    url = this.getFullUrl(url);
    const response: AxiosResponse<T> = await this.httpClient.get(url, {
      ...this.getHttpRequestConfig(),
      ...config,
    });
    return response.data;
  }

  public async post<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ) {
    url = this.getFullUrl(url);
    const response: AxiosResponse<T> = await this.httpClient.post(
      url,
      request,
      {
        ...this.getHttpRequestConfig(),
        ...config,
      }
    );
    return response.data;
  }

  public async put<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ) {
    url = this.getFullUrl(url);
    const response: AxiosResponse<T> = await this.httpClient.put(url, request, {
      ...this.getHttpRequestConfig(),
      ...config,
    });
    return response.data;
  }

  public async patch<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ) {
    url = this.getFullUrl(url);
    const response: AxiosResponse<T> = await this.httpClient.patch(
      url,
      request,
      {
        ...this.getHttpRequestConfig(),
        ...config,
      }
    );
    return response.data;
  }

  public async delete<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ) {
    url = this.getFullUrl(url);
    const response: AxiosResponse<T> = await this.httpClient.delete(url, {
      ...this.getHttpRequestConfig(),
      ...config,
      data: request,
    });
    return response.data;
  }

  private async getAndReturnCache<T = any>(
    url: string,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const key = `GET ${this.getFullUrl(url)}`;
    const action = () => this.httpClient.get(url, config);
    return this.checkCache(key, action);
  }

  private async postAndReturnCache<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const key = `POST ${this.getFullUrl(url)}`;
    const action = () => this.httpClient.post(url, request, config);
    return this.checkCache(key, action);
  }

  private async putAndReturnCache<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const key = `PUT ${this.getFullUrl(url)}`;
    const action = () => this.httpClient.put(url, request, config);
    return this.checkCache(key, action);
  }

  private async patchAndReturnCache<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const key = `PATCH ${this.getFullUrl(url)}`;
    const action = () => this.httpClient.patch(url, request, config);
    return this.checkCache(key, action);
  }

  private async deleteAndReturnCache<T = any>(
    url: string,
    request: any,
    config?: AxiosRequestConfig
  ): Promise<T> {
    const key = `DELETE ${this.getFullUrl(url)}`;
    const action = () =>
      this.httpClient.delete(this.getFullUrl(url), {
        ...config,
        data: request,
      });
    return this.checkCache(key, action);
  }

  private getHttpRequestConfig = (): AxiosRequestConfig => {
    const userSettings = this.localStorage.get(USER_SETTINGS_KEY);
    const username = userSettings?.username || DEFAULT_USERNAME;
    return {
      headers: {
        "Content-Type": "application/json",
        "X-User-Id": username,
      },
      // `axios` has a default POST body size of 10mb.
      // When uploading to FSS2 the POST body needs
      // to be able to be greater than that limit.
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
    };
  };

  protected getFullUrl = (url: string) => {
    if (url.startsWith("http")) {
      return url;
    }
    return `${this.limsUrl}${url.startsWith("/") ? url : `/${url}`}`;
  };

  private get limsUrl() {
    const userSettings: LimsSettings | undefined =
      this.localStorage.get(USER_SETTINGS_KEY);
    let host = LIMS_HOST;
    let port = LIMS_PORT;
    const protocol = LIMS_PROTOCOL;
    if (userSettings?.limsHost && userSettings?.limsPort) {
      host = userSettings.limsHost;
      port = userSettings.limsPort;
    }
    return `${protocol}://${host}:${port}`;
  }

  private checkCache = async <T = any>(
    key: string,
    action: () => Promise<AxiosResponse<T>>
  ): Promise<T> => {
    const cachedResponse: T = this.localStorage.get(key) as T;
    if (cachedResponse) {
      return cachedResponse;
    }

    const response = await action();
    if (response.status === 200 && response.data) {
      this.localStorage.set(key, response.data);
    }
    return response.data;
  };
}

import { expect } from "chai";
import { createStubInstance, SinonStubbedInstance, stub } from "sinon";

import {
  LIMS_HOST,
  LIMS_PORT,
  LIMS_PROTOCOL,
  USER_SETTINGS_KEY,
} from "../../../../shared/constants";
import EnvironmentAwareStorage from "../../../state/EnvironmentAwareStorage";
import { LocalStorage } from "../../../types";
import { HttpClient } from "../../types";
import HttpCacheClient from "../index";

describe("HttpCacheClient", () => {
  const url = "/foo";
  const limsURL = `${LIMS_PROTOCOL}://${LIMS_HOST}:${LIMS_PORT}`;
  const data = [{}];
  let httpClient: HttpClient;
  let storage: SinonStubbedInstance<EnvironmentAwareStorage>;

  beforeEach(() => {
    storage = createStubInstance(EnvironmentAwareStorage);
    // Stub `get` specifically, since it is a class property and not on the prototype
    storage.get = stub();

    const response = { data };
    httpClient = {
      get: stub().resolves(response),
      post: stub().resolves(response),
      put: stub().resolves(response),
      patch: stub().resolves(response),
      delete: stub().resolves(response),
    };
  });

  it("doesn't use cache if useCache is false", async () => {
    const httpCacheClient = new HttpCacheClient(
      httpClient,
      storage as any as LocalStorage,
      false
    );
    await httpCacheClient.get(url);
    await httpCacheClient.post(url, {});
    await httpCacheClient.put(url, {});
    await httpCacheClient.patch(url, {});
    await httpCacheClient.delete(url, {});
    expect(storage.get.calledWith(`GET ${limsURL}${url}`)).to.be.false;
    expect(storage.get.calledWith(`POST ${limsURL}${url}`)).to.be.false;
    expect(storage.get.calledWith(`PUT ${limsURL}${url}`)).to.be.false;
    expect(storage.get.calledWith(`PATCH ${limsURL}${url}`)).to.be.false;
    expect(storage.get.calledWith(`DELETE ${limsURL}${url}`)).to.be.false;
  });
  it("uses cache if useCache is true", async () => {
    const httpCacheClient = new HttpCacheClient(
      httpClient,
      storage as any as LocalStorage,
      true
    );
    await httpCacheClient.get(url);
    await httpCacheClient.post(url, {});
    await httpCacheClient.put(url, {});
    await httpCacheClient.patch(url, {});
    await httpCacheClient.delete(url, {});
    expect(storage.get.calledWith(`GET ${limsURL}${url}`)).to.be.true;
    expect(storage.get.calledWith(`POST ${limsURL}${url}`)).to.be.true;
    expect(storage.get.calledWith(`PUT ${limsURL}${url}`)).to.be.true;
    expect(storage.get.calledWith(`PATCH ${limsURL}${url}`)).to.be.true;
    expect(storage.get.calledWith(`DELETE ${limsURL}${url}`)).to.be.true;
  });
  it("makes http request if useCache=false and returns response.data", async () => {
    const httpCacheClient = new HttpCacheClient(
      httpClient,
      storage as any as LocalStorage,
      false
    );
    const result = await httpCacheClient.get(url);
    expect(result).to.equal(data);
  });
  it("returns cache if exists and useCache=true", async () => {
    const data2 = {};
    storage.get.withArgs(`GET ${limsURL}${url}`).returns(data2);
    const httpCacheClient = new HttpCacheClient(
      httpClient,
      storage as any as LocalStorage,
      true
    );
    const result = await httpCacheClient.get(url);
    expect(result).to.equal(data2);
  });
  it("makes http request if cache does not exist and useCache=true", async () => {
    const httpCacheClient = new HttpCacheClient(
      httpClient,
      storage as any as LocalStorage,
      true
    );
    const result = await httpCacheClient.get(url);
    expect(result).to.equal(data);
  });
  it("gets LIMS host and port from user settings", async () => {
    storage.get
      .withArgs(USER_SETTINGS_KEY)
      .returns({ limsHost: "prod", limsPort: 1234 });
    const httpCacheClient = new HttpCacheClient(
      httpClient,
      storage as any as LocalStorage,
      false
    );
    await httpCacheClient.get(url);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(httpClient.get).to.have.been.calledOnceWith("http://prod:1234/foo");
  });
  it("uses default LIMS host and port", async () => {
    storage.get.withArgs(USER_SETTINGS_KEY).returns(undefined);
    const httpCacheClient = new HttpCacheClient(
      httpClient,
      storage as any as LocalStorage,
      false
    );
    await httpCacheClient.get(url);
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(httpClient.get).to.have.been.calledOnceWith(
      "http://localhost:8080/foo"
    );
  });
});

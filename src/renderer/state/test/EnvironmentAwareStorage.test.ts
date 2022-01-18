import { expect } from "chai";
import ElectronStore from "electron-store";
import * as lodash from "lodash";
import {
  restore,
  createStubInstance,
  SinonStubbedInstance,
  stub,
  match,
} from "sinon";

import { USER_SETTINGS_KEY } from "../../../shared/constants";
import EnvironmentAwareStorage from "../EnvironmentAwareStorage";

// Match a string with an MD5 prefix added
const withPrefix = (str: string) => new RegExp(`^[a-fA-F0-9]{32}.${str}$`);

describe("EnvironmentAwareStorage", () => {
  let mockStore: SinonStubbedInstance<ElectronStore<any>>;
  let storage: EnvironmentAwareStorage;

  beforeEach(() => {
    mockStore = createStubInstance(ElectronStore);
    // Stub `get` specifically, since it is a class property and not on the prototype
    mockStore.get = stub();
    storage = new EnvironmentAwareStorage(mockStore as any as ElectronStore);
  });

  afterEach(() => restore());

  it("calls base set method with prefixed key if first arg is a string", () => {
    storage.set("foo", "bar");
    expect(mockStore.set).to.have.been.calledWith(
      match(withPrefix("foo")),
      "bar"
    );
  });

  it("prefixes keys in object if first arg is object", () => {
    storage.set({ foo: "bar" });
    expect(mockStore.set).to.have.been.calledWith(
      match((obj) => {
        const [key, value] = Object.entries(obj)[0];
        return withPrefix("foo").test(key) && value === "bar";
      })
    );
  });

  it("returns value after prefixing key", () => {
    storage.get("foo");
    expect(mockStore.get).to.have.been.calledWith(match(withPrefix("foo")));
  });

  it("passes default value if provided", () => {
    storage.get("foo", "bar");
    expect(mockStore.get).to.have.been.calledWith(
      match(withPrefix("foo")),
      "bar"
    );
  });

  it("memoizes the call to get", () => {
    storage.get(USER_SETTINGS_KEY);
    storage.get("foo");
    storage.get(USER_SETTINGS_KEY);
    // Since the call to `get` is memoized, the second call with
    // `USER_SETTINGS_KEY` should not reach the underlying `get` method on the
    // store.
    expect(mockStore.get).to.have.been.calledTwice;
  });

  it("doesn't prefix key if key starts with 'userSettings'", () => {
    storage.get("userSettings.username");
    expect(mockStore.get).to.have.been.calledWith("userSettings.username");
  });

  it("calls base delete method with prefixed key", () => {
    storage.delete("foo");
    expect(mockStore.delete).to.have.been.calledWith(match(withPrefix("foo")));
  });

  it("calls base has method with prefixed key", () => {
    storage.has("foo");
    expect(mockStore.has).to.have.been.calledWith(match(withPrefix("foo")));
  });

  it("calls base reset method with prefixed keys", () => {
    storage.reset("foo", "bar");
    expect(mockStore.reset).to.have.been.calledWith(
      match(withPrefix("foo")),
      match(withPrefix("bar"))
    );
  });

  describe("Set, get, and caching", () => {
    // This simulates what is actually stored on disk, and prevents any
    // unexpected behavior from shared object references.
    let storeStr: string;
    // Convenience func, since this is called a lot
    const parseStore = () => JSON.parse(storeStr);

    beforeEach(() => {
      storeStr = "{}";

      // Use `get` and `set` from Lodash to support getting and setting
      // properties by path, which is behavior that `electron-store`
      // supports.
      mockStore.get.callsFake((path) =>
        lodash.get(parseStore(), path as string)
      );
      // The Sinon typing seems to be confused by the overload of `set`, so
      // we use an `any` type assertion to get around that.
      mockStore.set.callsFake(((path: string, value: string) => {
        storeStr = JSON.stringify(lodash.set(parseStore(), path, value));
      }) as any);
    });

    it("sets nested properties", () => {
      // Ensure that you can set nested properties
      storage.set(`${USER_SETTINGS_KEY}.foo`, "bar");
      expect(parseStore()[USER_SETTINGS_KEY].foo).to.equal("bar");

      // Ensure that you can overwrite an entire object
      storage.set(USER_SETTINGS_KEY, { newFoo: "newBar" });
      expect(parseStore()).to.deep.equal({
        [USER_SETTINGS_KEY]: { newFoo: "newBar" },
      });
    });

    it("gets nested properties", () => {
      storeStr = JSON.stringify({
        [USER_SETTINGS_KEY]: { foo: "bar" },
      });

      expect(storage.get(USER_SETTINGS_KEY)).to.deep.equal({ foo: "bar" });
      expect(storage.get(`${USER_SETTINGS_KEY}.foo`)).to.equal("bar");
    });

    it("clears the memoized value for `get` after a `set` happens", () => {
      storeStr = JSON.stringify({
        [USER_SETTINGS_KEY]: { foo: "bar" },
      });
      // The value will be memoized
      const settingsBeforeSet = storage.get(USER_SETTINGS_KEY);
      expect(settingsBeforeSet).to.deep.equal({ foo: "bar" });

      // Set a nested prop on the settings
      storage.set(`${USER_SETTINGS_KEY}.foo`, "newBar");
      expect(parseStore()[USER_SETTINGS_KEY].foo).to.equal("newBar");

      // Expect that the previous memoized value has been cleared or updated
      expect(storage.get(USER_SETTINGS_KEY)).to.deep.equal({ foo: "newBar" });
    });
  });
});

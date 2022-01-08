import ElectronStore from "electron-store";
import { isNil, isPlainObject, memoize } from "lodash";
import * as hash from "object-hash";

import {
  DEFAULT_USERNAME,
  LIMS_HOST,
  LIMS_PORT,
  LIMS_PROTOCOL,
  USER_SETTINGS_KEY,
} from "../../shared/constants";
import { LocalStorage } from "../types";

type Storage = Record<any, any>;
type Key = keyof Storage;

/**
 * Wrapper for electron-store's default class. Scopes reads and writes to environmental settings using LIMS URL values
 * and username
 */
export class EnvironmentAwareStorage<T = Storage> implements LocalStorage<T> {
  public protocol: string = LIMS_PROTOCOL;
  public host: string = LIMS_HOST;
  public port: string = LIMS_PORT;
  public user: string = DEFAULT_USERNAME;
  private store: ElectronStore<Storage>;

  constructor(store: ElectronStore) {
    this.store = store;
  }

  /**
   * Sets key/value(s) in local storage file
   * @param keyOrObject. If a Key (string) is provided, 2nd arg is required to define the value for the key.
   * If an object, second arg is ignored.
   * @param value. Corresponding value for key defined in first arg
   */
  public set(keyOrObject: Key | Partial<T>, value?: T[Key]) {
    const prefixedKeys = new Set<Key>();
    if (isPlainObject(keyOrObject)) {
      const objectWithPrefixes: any = {};
      for (const [key, value] of Object.entries(keyOrObject)) {
        const prefixedKey = this.getPrefixedKey(key);
        prefixedKeys.add(prefixedKey);
        objectWithPrefixes[prefixedKey] = value;
      }
      this.store.set(objectWithPrefixes);
    } else if (
      !isNil(value) &&
      (typeof keyOrObject === "string" || typeof keyOrObject === "number")
    ) {
      const prefixedKey = this.getPrefixedKey(keyOrObject);
      prefixedKeys.add(prefixedKey);
      this.store.set(prefixedKey as string, value);
    } else {
      throw new Error(
        "Expected first argument to be an object, string, or number."
      );
    }
    // Setting a key will completely clear the cache.
    if (this.get.cache.clear) {
      this.get.cache.clear();
    }
  }

  /**
   * Gets the value corresponding to a key. Results are cached until invalidated by set method.
   * @param key. key of local storage JSON object. Can use dot notation to access nested properties.
   * @param defaultValue. optional default value if key is not found
   */
  public get = memoize((key: Key, defaultValue?: T[Key]): T[Key] => {
    if (defaultValue) {
      return this.store.get<Key>(this.getPrefixedKey(key), defaultValue);
    }
    return this.store.get<Key>(this.getPrefixedKey(key));
  });

  public delete(key: Key): void {
    this.store.delete<Key>(this.getPrefixedKey(key));
  }

  public has(key: Key): boolean {
    return this.store.has<Key>(this.getPrefixedKey(key));
  }

  public reset(...keys: Key[]) {
    this.store.reset<Key>(...keys.map((k: Key) => this.getPrefixedKey(k)));
  }

  public clear(): void {
    this.store.clear();
  }

  private getPrefixedKey(key: Key): Key {
    return `${key}`.startsWith(USER_SETTINGS_KEY)
      ? key
      : (`${this.prefix}.${key}` as Key);
  }

  private get prefix() {
    return hash.MD5({
      host: this.host,
      port: this.port,
      protocol: this.protocol,
      user: this.user,
    });
  }
}

export default EnvironmentAwareStorage;

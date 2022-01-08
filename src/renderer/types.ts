import { MemoizedFunction } from "lodash";

export type LocalStorageGet<T = any> = (<Key extends keyof T>(
  key: Key,
  defaultValue?: T[Key]
) => any) &
  MemoizedFunction;

type Storage = Record<any, any>;
type Key = keyof Storage;
export interface LocalStorage<T = Storage> {
  clear: () => void;
  delete: (key: Key) => void;
  get: LocalStorageGet<T>;
  has: (key: Key) => boolean;
  reset: (...keys: Key[]) => void;
  set: (keyOrObject: Key | Partial<T>, value?: T[Key]) => void;
}

export interface Duration {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

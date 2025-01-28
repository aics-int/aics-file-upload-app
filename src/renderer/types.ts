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

// "UploadType" types declarations would ideally live under `/state/types.ts` (if not `/state/selection/types.ts`)
//  But, unfortunately, putting them down there causes some nasty circular dependency issues.
//   -TF 2025-01-22
export interface SelectUploadTypeAction {
  payload: UploadType,
  type: string
}

export enum UploadType {
  File = 'File',
  Multifile = 'Multifile'
}

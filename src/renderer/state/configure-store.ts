import { readFile as fsReadFile, writeFile as fsWriteFile } from "fs";
import { promisify } from "util";

import axios from "axios";
import { ipcRenderer, remote } from "electron";
import * as Store from "electron-store";
import * as Logger from "js-logger";
import { forEach, isNil } from "lodash";
import * as moment from "moment";
import {
  AnyAction,
  applyMiddleware,
  combineReducers,
  createStore,
  Middleware,
} from "redux";
import { createLogicMiddleware } from "redux-logic";

import { TEMP_UPLOAD_STORAGE_KEY } from "../../shared/constants";
import { JobStatusClient, LabkeyClient, MMSClient } from "../services";
import { FileManagementSystem, FileStorageClient } from "../services";
import ApplicationInfoService from "../services/application-info";

import EnvironmentAwareStorage from "./EnvironmentAwareStorage";
import { addEvent } from "./feedback/actions";
import { getCurrentUploadFilePath } from "./metadata/selectors";
import { AlertType, ReduxLogicExtraDependencies, State } from "./types";

import {
  enableBatching,
  feedback,
  job,
  metadata,
  route,
  selection,
  setting,
  template,
  upload,
} from "./";

const readFile = promisify(fsReadFile);
const writeFile = promisify(fsWriteFile);

const reducers = {
  feedback: feedback.reducer,
  job: job.reducer,
  metadata: metadata.reducer,
  route: route.reducer,
  selection: selection.reducer,
  setting: setting.reducer,
  template: template.reducer,
  upload: upload.reducer,
};

const logics = [
  ...feedback.logics,
  ...job.logics,
  ...metadata.logics,
  ...route.logics,
  ...selection.logics,
  ...setting.logics,
  ...template.logics,
  ...upload.logics,
];

const storage = new EnvironmentAwareStorage(new Store());
// Configure Axios to use the `XMLHttpRequest` adapter. Axios uses either
// `XMLHttpRequest` or Node's `http` module, depending on the environment it is
// running in. See more info here: https://github.com/axios/axios/issues/552.
// In our case, Axios was using Node's `http` module. Due to this, network
// requests were not visible in the "Network" tab of the Chromium dev tools,
// because the requests were happening in the Node layer, rather than the
// Chromium layer. Additionally, we had seen cases for many months where the app
// would hang after making network requests. This issue completely disappears
// when using the `XMLHttpRequest` adapter. This may be due to some unresolved
// issues with Electron and/or Node running on
// Linux (https://github.com/electron/electron/issues/10570).
axios.defaults.adapter = require("axios/lib/adapters/xhr");
const httpClient = axios;
const useCache = Boolean(process.env.ELECTRON_WEBPACK_USE_CACHE) || false;
const jssClient = new JobStatusClient(httpClient, storage, useCache, "debug");
const mmsClient = new MMSClient(httpClient, storage, useCache);
const labkeyClient = new LabkeyClient(httpClient, storage, useCache);
const applicationInfoService = new ApplicationInfoService(
  httpClient,
  storage,
  false
);
export const reduxLogicDependencies: ReduxLogicExtraDependencies = {
  dialog: remote.dialog,
  fms: new FileManagementSystem({
    fss: new FileStorageClient(httpClient, storage),
    jss: jssClient,
    lk: labkeyClient,
    mms: mmsClient,
  }),
  getApplicationMenu: () => remote.Menu.getApplicationMenu(),
  ipcRenderer,
  jssClient,
  labkeyClient,
  logger: Logger,
  applicationInfoService,
  mmsClient,
  readFile,
  remote,
  storage,
  writeFile,
};

const autoSaver = (store: any) => (next: any) => async (action: AnyAction) => {
  let result = next(action);
  if (action.autoSave) {
    const nextState = store.getState();
    const currentUploadFilePath = getCurrentUploadFilePath(nextState);
    if (currentUploadFilePath) {
      try {
        await writeFile(currentUploadFilePath, JSON.stringify(nextState));
      } catch (e) {
        return next(
          addEvent(
            `Failed to autosave file: ${e.message}`,
            AlertType.ERROR,
            new Date()
          )
        );
      }
    } else {
      storage.set(TEMP_UPLOAD_STORAGE_KEY, nextState);
    }

    result = next(
      addEvent(
        `Your draft was saved at ${moment().format("h:mm a")}`,
        AlertType.DRAFT_SAVED,
        new Date()
      )
    );
  }

  return result;
};

const storageWriter = () => (next: any) => (action: AnyAction) => {
  if (action.writeToStore && action.updates) {
    forEach(action.updates, (value: any, key: string) => {
      if (isNil(value)) {
        Logger.info(`Deleting key=${key} from local storage`);
        storage.delete(key);
      } else {
        Logger.info(`Writing to local storage for key: ${key}, and value:`);
        Logger.info(JSON.stringify(value));
        storage.set(key, value);
      }
    });
  }
  return next(action);
};

interface CreateReduxStoreParams {
  initialState?: State;
  middleware?: Middleware[];
}

export default function createReduxStore(params: CreateReduxStoreParams = {}) {
  const logicMiddleware = createLogicMiddleware(logics, reduxLogicDependencies);
  const middleware = applyMiddleware(
    logicMiddleware,
    autoSaver,
    storageWriter,
    ...(params.middleware || [])
  );
  const rootReducer = enableBatching<State>(combineReducers(reducers));

  if (params.initialState) {
    return createStore(rootReducer, params.initialState, middleware);
  }

  return createStore(rootReducer, middleware);
}

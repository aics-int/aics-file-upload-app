import {
  applyMiddleware,
  combineReducers,
  createStore,
  Middleware,
  Store,
} from "redux";
import { createLogicMiddleware, LogicMiddleware } from "redux-logic";
import { Logic } from "redux-logic/definitions/logic";
import {
  createStubInstance,
  SinonStub,
  SinonStubbedInstance,
  stub,
} from "sinon";

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
} from "../";
import {
  JobStatusService,
  LabkeyClient,
  MetadataManagementService,
} from "../../services";
import ApplicationInfoService from "../../services/application-info-service";
import FileManagementSystem from "../../services/file-management-system";
import EnvironmentAwareStorage from "../EnvironmentAwareStorage";
import { State } from "../types";

import { Actions, default as ActionTracker } from "./action-tracker";
import { getMockStateWithHistory } from "./mocks";

export interface LocalStorageStub {
  clear: SinonStub;
  delete: SinonStub;
  get: SinonStub;
  has: SinonStub;
  reset: SinonStub;
  set: SinonStub;
}

export interface ReduxLogicDependencies {
  applicationInfoService: SinonStubbedInstance<ApplicationInfoService>;
  dialog: {
    showMessageBox: SinonStub;
    showOpenDialog: SinonStub;
  };
  fms: SinonStubbedInstance<FileManagementSystem>;
  getApplicationMenu: SinonStub;
  ipcRenderer: {
    on: SinonStub;
    send: SinonStub;
  };
  jssClient: SinonStubbedInstance<JobStatusService>;
  labkeyClient: SinonStubbedInstance<LabkeyClient>;
  logger: {
    debug: SinonStub;
    error: SinonStub;
    info: SinonStub;
    warn: SinonStub;
  };
  mmsClient: SinonStubbedInstance<MetadataManagementService>;
  readFile: SinonStub;
  remote: {
    getCurrentWindow: SinonStub;
  };
  storage: SinonStubbedInstance<EnvironmentAwareStorage>;
  writeFile: SinonStub;
}

const storage = createStubInstance(EnvironmentAwareStorage);
const applicationInfoService = createStubInstance(ApplicationInfoService);
const jssClient = createStubInstance(JobStatusService);
const labkeyClient = createStubInstance(LabkeyClient);
const mmsClient = createStubInstance(MetadataManagementService);
const fms = createStubInstance(FileManagementSystem);

export const switchEnvMenuItem = {
  enabled: true,
  label: "Switch Environment",
};

export const getApplicationMenu = stub().returns({
  items: [
    {
      enabled: true,
      label: "File",
      submenu: {
        items: [
          { enabled: true, label: "New" },
          { enabled: true, label: "Open" },
          switchEnvMenuItem,
        ],
      },
    },
  ],
});

export const dialog = {
  showMessageBox: stub(),
  showOpenDialog: stub(),
  showSaveDialog: stub(),
};

export const logger = {
  debug: stub(),
  error: stub(),
  info: stub(),
  time: stub(),
  timeEnd: stub(),
  warn: stub(),
};

export const ipcRenderer = {
  on: stub(),
  send: stub(),
};

export const remote = {
  getCurrentWindow: stub(),
};

export const mockReduxLogicDeps: ReduxLogicDependencies = {
  applicationInfoService,
  dialog,
  fms,
  getApplicationMenu,
  ipcRenderer,
  jssClient,
  labkeyClient,
  logger,
  mmsClient,
  readFile: stub().resolves("foo"),
  remote,
  storage,
  writeFile: stub().resolves(),
};

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

const allLogics: Array<Logic<any, any, any, any, any, any>> = [
  ...feedback.logics,
  ...job.logics,
  ...metadata.logics,
  ...route.logics,
  ...selection.logics,
  ...setting.logics,
  ...template.logics,
  ...upload.logics,
];

const initialState: State = {
  feedback: feedback.initialState,
  job: job.initialState,
  metadata: metadata.initialState,
  route: route.initialState,
  selection: selection.initialState,
  setting: setting.initialState,
  template: template.initialState,
  upload: getMockStateWithHistory(upload.initialState),
};

export function createMockReduxStore(
  mockState: State = initialState,
  reduxLogicDependencies: ReduxLogicDependencies = mockReduxLogicDeps,
  logics?: Array<Logic<any, any, any, any, any, any>>,
  spreadBatched = true
): {
  store: Store;
  logicMiddleware: LogicMiddleware<State, ReduxLogicDependencies>;
  actions: Actions;
} {
  if (!logics) {
    logics = allLogics;
  }
  // redux-logic middleware
  const logicMiddleware: LogicMiddleware<
    State,
    ReduxLogicDependencies
  > = createLogicMiddleware(logics);
  logicMiddleware.addDeps(reduxLogicDependencies);

  // action tracking middleware
  const actionTracker = new ActionTracker();
  const trackActionsMiddleware: Middleware = () => (next) => (action) => {
    if (action.batch && spreadBatched) {
      actionTracker.track(...action.payload);
    } else {
      actionTracker.track(action);
    }
    return next(action);
  };
  const middleware = applyMiddleware(logicMiddleware, trackActionsMiddleware);
  const rootReducer = enableBatching<State>(combineReducers(reducers));

  return {
    actions: actionTracker.actions,
    logicMiddleware,
    store: createStore(rootReducer, mockState, middleware),
  };
}

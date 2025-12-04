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
  metadataExtraction,
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
  fms: SinonStubbedInstance<FileManagementSystem>;
  ipcRenderer: {
    invoke: SinonStub;
    on: SinonStub;
    send: SinonStub;
  };
  jssClient: SinonStubbedInstance<JobStatusService>;
  labkeyClient: SinonStubbedInstance<LabkeyClient>;
  mmsClient: SinonStubbedInstance<MetadataManagementService>;
  storage: SinonStubbedInstance<EnvironmentAwareStorage>;
}

const storage = createStubInstance(EnvironmentAwareStorage);
const applicationInfoService = createStubInstance(ApplicationInfoService);
const jssClient = createStubInstance(JobStatusService);
const labkeyClient = createStubInstance(LabkeyClient);
const mmsClient = createStubInstance(MetadataManagementService);
const fms = createStubInstance(FileManagementSystem);

export const ipcRenderer = {
  invoke: stub(),
  on: stub(),
  send: stub(),
};

export const mockReduxLogicDeps: ReduxLogicDependencies = {
  applicationInfoService,
  fms,
  ipcRenderer,
  jssClient,
  labkeyClient,
  mmsClient,
  storage,
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
  metadataExtraction: metadataExtraction.metadataExtractionInitialState,
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
  const logicMiddleware: LogicMiddleware<State, ReduxLogicDependencies> =
    createLogicMiddleware(logics);
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

import {
    applyMiddleware,
    combineReducers,
    createStore,
} from "redux";
import { createLogicMiddleware } from "redux-logic";
import { SinonStub, stub } from "sinon";

import {
    enableBatching,
    feedback,
    job,
    metadata,
    selection,
    setting,
    upload,
} from "../";
import { State } from "../types";
import {
    mockFailedUploadJob,
    mockImagingSession,
    mockSuccessfulUploadJob,
    mockUnit,
    mockWorkingUploadJob,
} from "./mocks";

export interface ReduxLogicDependencies {
    dialog: {
        showMessageBox: SinonStub;
    };
    fms: {
        host: string;
        port: string;
        retryUpload: SinonStub;
        uploadFiles: SinonStub;
        validateMetadata: SinonStub;
    };
    httpClient: {
        get: SinonStub;
        post: SinonStub;
    };
    ipcRenderer: {
        on: SinonStub;
        send: SinonStub;
    };
    jssClient: {
        createJob: SinonStub;
        getJob: SinonStub;
        getJobs: SinonStub;
        host: string;
        port: string;
        updateJob: SinonStub;
    };
    labkeyClient: {
        getBarcodePrefixes: SinonStub;
        getColumnValues: SinonStub;
        getDatabaseMetadata: SinonStub;
        getImagingSessions: SinonStub;
        getPlatesByBarcode: SinonStub;
        getUnits: SinonStub;
    };
    storage: {
        get: SinonStub,
        has: SinonStub;
        set: SinonStub;
    };
}

export const mockReduxLogicDeps: ReduxLogicDependencies = {
    dialog: {
        showMessageBox: stub(),
    },
    fms: {
        host: "localhost",
        port: "80",
        retryUpload: stub().resolves(),
        uploadFiles: stub().resolves(),
        validateMetadata: stub().resolves(),
    },
    httpClient: {
        get: stub(),
        post: stub(),
    },
    ipcRenderer: {
        on: stub(),
        send: stub(),
    },
    jssClient: {
        createJob: stub().resolves(mockSuccessfulUploadJob),
        getJob: stub(),
        getJobs: stub().resolves([mockSuccessfulUploadJob, mockWorkingUploadJob, mockFailedUploadJob]),
        host: "localhost",
        port: "80",
        updateJob: stub().resolves(mockSuccessfulUploadJob),
    },
    labkeyClient: {
        getBarcodePrefixes: stub().resolves(["AD", "AX", "GE", "GX"]),
        getColumnValues: stub().resolves(["id", "name"]),
        getDatabaseMetadata: stub(),
        getImagingSessions: stub().resolves([mockImagingSession]),
        getPlatesByBarcode: stub(),
        getUnits: stub().resolves([mockUnit]),
    },
    storage: {
        get: stub(),
        has: stub(),
        set: stub(),
    },
};

const reducers = {
    feedback: feedback.reducer,
    job: job.reducer,
    metadata: metadata.reducer,
    selection: selection.reducer,
    setting: setting.reducer,
    upload: upload.reducer,
};

const logics = [
    ...feedback.logics,
    ...job.logics,
    ...metadata.logics,
    ...selection.logics,
    ...setting.logics,
    ...upload.logics,
];

export function createMockReduxStore(initialState: State,
                                     reduxLogicDependencies: ReduxLogicDependencies = mockReduxLogicDeps) {
    const logicMiddleware = createLogicMiddleware(logics, reduxLogicDependencies);
    const middleware = applyMiddleware(logicMiddleware);
    const rootReducer = enableBatching<State>(combineReducers(reducers));

    if (initialState) {
        return createStore(rootReducer, initialState, middleware);
    }
    return createStore(rootReducer, middleware);
}

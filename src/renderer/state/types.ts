import { FileManagementSystem } from "@aics/aicsfiles";
import { JobStatusClient } from "@aics/job-status-client";
import { Menu } from "electron";
import { AnyAction } from "redux";
import { CreateLogic } from "redux-logic/definitions/logic";
import { StateWithHistory } from "redux-undo";
import LabkeyClient from "../util/labkey-client";
import MMSClient from "../util/mms-client";

import { FeedbackStateBranch } from "./feedback/types";
import { JobStateBranch } from "./job/types";
import { MetadataStateBranch } from "./metadata/types";
import { SelectionStateBranch } from "./selection/types";
import { SettingStateBranch } from "./setting/types";
import { TemplateStateBranch } from "./template/types";
import { UploadStateBranch } from "./upload/types";
import Process = CreateLogic.Config.Process;
import DepObj = CreateLogic.Config.DepObj;
import MessageBoxOptions = Electron.MessageBoxOptions;

export interface ActionDescription {
    accepts: (action: AnyAction) => boolean;
    perform: (state: any, action: any) => any;
}

export interface BatchedAction {
    type: string;
    batch: boolean;
    payload: AnyAction[];
}

export interface ReduxLogicExtraDependencies {
    ctx?: any;
    fms: FileManagementSystem;
    ipcRenderer: {
        on: (channel: string, listener: (...args: any[]) => void) => void;
        send: (channel: string, ...args: any[]) => void;
    };
    jssClient: JobStatusClient;
    labkeyClient: LabkeyClient;
    mmsClient: MMSClient;
    remote: {
        Menu: {
            getApplicationMenu: () => Menu | null;
        };
        dialog: {
            showMessageBox(
                options: MessageBoxOptions,
                callback?: (response: number, checkboxChecked: boolean) => void
            ): number;
        };
    };
    storage: {
        get: (key: string) => any,
        has: (key: string) => boolean;
        set: (key: string, value: any) => void;
    };
}

export type ReduxLogicProcessDependencies = Process.DepObj<State, AnyAction, ReduxLogicExtraDependencies>;
export type ReduxLogicTransformDependencies = DepObj<State, AnyAction, ReduxLogicExtraDependencies>;

export type ReduxLogicNextCb = (action: AnyAction) => void;
export type ReduxLogicRejectCb = () => void;
export type ReduxLogicDoneCb = () => void;

export interface State {
    feedback: FeedbackStateBranch;
    job: JobStateBranch;
    metadata: MetadataStateBranch;
    selection: StateWithHistory<SelectionStateBranch>;
    setting: SettingStateBranch;
    template: StateWithHistory<TemplateStateBranch>;
    upload: StateWithHistory<UploadStateBranch>;
}

export interface TypeToDescriptionMap {
    [propName: string ]: ActionDescription;
}

export interface Audited {
    created: string; // Date string
    createdBy: number;
    modified: string; // Date string
    modifiedBy: number;
}

export interface LocalStorage {
    get: (key: string) => void;
    set: (key: string, value: any) => void;
}

export enum HTTP_STATUS {
    BAD_GATEWAY = 502,
    BAD_REQUEST = 400,
    INTERNAL_SERVER_ERROR = 500,
    OK = 200,
}

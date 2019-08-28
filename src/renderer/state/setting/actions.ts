import {
    ADD_SCHEMA_FILE_PATH,
    ASSOCIATE_BY_WORKFLOW,
    GATHER_SETTINGS,
    REMOVE_SCHEMA_FILE_PATH,
    UPDATE_SETTINGS
} from "./constants";
import {
    AddSchemaFilepathAction,
    AssociateByWorkflowAction,
    GatherSettingsAction,
    RemoveSchemaFilepathAction,
    SettingStateBranch,
    UpdateSettingsAction,
} from "./types";

export function addSchemaFilepath(payload: string): AddSchemaFilepathAction {
    return {
        payload,
        type: ADD_SCHEMA_FILE_PATH,
    };
}

export function removeSchemaFilepath(payload: string): RemoveSchemaFilepathAction {
    return {
        payload,
        type: REMOVE_SCHEMA_FILE_PATH,
    };
}

export function updateSettings(payload: Partial<SettingStateBranch>): UpdateSettingsAction {
    return {
        payload,
        type: UPDATE_SETTINGS,
    };
}

export function gatherSettings(): GatherSettingsAction {
    return {
        type: GATHER_SETTINGS,
    };
}

export function associateByWorkflow(shouldAssociateByWorkflow: boolean): AssociateByWorkflowAction {
    return {
        payload: shouldAssociateByWorkflow,
        type: ASSOCIATE_BY_WORKFLOW,
    };
}

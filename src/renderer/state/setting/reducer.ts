import { AnyAction } from "redux";

import { LIMS_HOST, LIMS_PORT, LIMS_PROTOCOL } from "../../../shared/constants";
import { SelectionStateBranch } from "../selection/types";
import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import {
    ASSOCIATE_BY_WORKFLOW,
    SET_METADATA_COLUMNS,
    UPDATE_SETTINGS,
} from "./constants";
import {
    AssociateByWorkflowAction,
    SetMetadataColumnsAction,
    SettingStateBranch,
    UpdateSettingsAction
} from "./types";

export const initialState: SettingStateBranch = {
    associateByWorkflow: false,
    limsHost: LIMS_HOST,
    limsPort: LIMS_PORT,
    limsProtocol: LIMS_PROTOCOL,
    metadataColumns: [],
    templateIds: [],
};

const actionToConfigMap: TypeToDescriptionMap = {
    [UPDATE_SETTINGS]: {
        accepts: (action: AnyAction): action is UpdateSettingsAction => action.type === UPDATE_SETTINGS,
        perform: (state: SettingStateBranch, action: UpdateSettingsAction) => ({ ...state, ...action.payload }),
    },
    [ASSOCIATE_BY_WORKFLOW]: {
        accepts: (action: AnyAction): action is AssociateByWorkflowAction => action.type === ASSOCIATE_BY_WORKFLOW,
        perform: (state: SettingStateBranch, action: AssociateByWorkflowAction) =>
            ({ ...state, associateByWorkflow: action.payload }),
    },
    [SET_METADATA_COLUMNS]: {
        accepts: (action: AnyAction): action is SetMetadataColumnsAction => action.type === SET_METADATA_COLUMNS,
        perform: (state: SelectionStateBranch, action: SetMetadataColumnsAction) => ({
            ...state,
            metadataColumns: action.payload,
        }),
    },
};

export default makeReducer<SettingStateBranch>(actionToConfigMap, initialState);

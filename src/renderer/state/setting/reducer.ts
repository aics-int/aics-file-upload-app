import { userInfo } from "os";

import { AnyAction } from "redux";

import { LIMS_HOST, LIMS_PORT, LIMS_PROTOCOL } from "../../../shared/constants";
import { SAVE_TEMPLATE_SUCCEEDED } from "../template/constants";
import { SaveTemplateSucceededAction } from "../template/types";
import { AlertType, SettingStateBranch, TypeToDescriptionMap } from "../types";
import { APPLY_TEMPLATE, SET_SHOULD_STORE_LOCALLY } from "../upload/constants";
import { ApplyTemplateAction } from "../upload/types";
import { makeReducer } from "../util";

import { GATHER_SETTINGS, UPDATE_SETTINGS,} from "./constants";
import { GatherSettingsAction, UpdateSettingsAction } from "./types";

export const initialState: SettingStateBranch = {
  limsHost: LIMS_HOST,
  limsPort: LIMS_PORT,
  limsProtocol: LIMS_PROTOCOL,
  metadataColumns: [],
  showUploadHint: true,
  showTemplateHint: true,
  username: userInfo().username,
  enabledNotifications: {
    [AlertType.WARN]: true,
    [AlertType.SUCCESS]: true,
    [AlertType.ERROR]: true,
    [AlertType.INFO]: true,
    [AlertType.DRAFT_SAVED]: false,
  },
  shouldStoreLocally: true,
};

const actionToConfigMap: TypeToDescriptionMap<SettingStateBranch> = {
  [GATHER_SETTINGS]: {
    accepts: (action: AnyAction): action is GatherSettingsAction =>
      action.type === GATHER_SETTINGS,
    perform: (state: SettingStateBranch, action: GatherSettingsAction) => ({
      ...state,
      ...action.payload,
    }),
  },
  [UPDATE_SETTINGS]: {
    accepts: (action: AnyAction): action is UpdateSettingsAction =>
      action.type === UPDATE_SETTINGS,
    perform: (state: SettingStateBranch, action: UpdateSettingsAction) => ({
      ...state,
      ...action.payload,
    }),
  },
  [APPLY_TEMPLATE]: {
    accepts: (action: AnyAction): action is ApplyTemplateAction =>
      action.type === APPLY_TEMPLATE,
    perform: (state: SettingStateBranch, action: ApplyTemplateAction) => ({
      ...state,
      templateId: action.payload,
    }),
  },
  [SAVE_TEMPLATE_SUCCEEDED]: {
    accepts: (action: AnyAction): action is SaveTemplateSucceededAction =>
      action.type === SAVE_TEMPLATE_SUCCEEDED,
    perform: (
      state: SettingStateBranch,
      action: SaveTemplateSucceededAction
    ) => ({
      ...state,
      templateId: action.payload,
    }),
  },
  [SET_SHOULD_STORE_LOCALLY]: {
    accepts: (action: AnyAction): action is AnyAction =>
      action.type === SET_SHOULD_STORE_LOCALLY,
    perform: (state: SettingStateBranch, action: AnyAction) => ({
      ...state,
      shouldStoreLocally: action.payload,
    }),
  },
};

export default makeReducer<SettingStateBranch>(actionToConfigMap, initialState);

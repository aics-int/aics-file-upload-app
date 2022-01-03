import { SettingStateBranch } from "../types";

export interface UpdateSettingsAction {
  payload: Partial<SettingStateBranch>;
  type: string;
}

export interface GatherSettingsAction {
  payload: Partial<SettingStateBranch>;
  type: string;
}

export interface OpenEnvironmentDialogAction {
  type: string;
}

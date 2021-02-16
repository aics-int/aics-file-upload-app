import { createSelector } from "reselect";

import { State } from "../types";

export const getLimsHost = (state: State) => state.setting.limsHost;
export const getLimsPort = (state: State) => state.setting.limsPort;
export const getLimsProtocol = (state: State) => state.setting.limsProtocol;
export const getMountPoint = (state: State) => state.setting.mountPoint;
export const getShowUploadHint = (state: State) => state.setting.showUploadHint;
export const getShowTemplateHint = (state: State) =>
  state.setting.showTemplateHint;
export const getLoggedInUser = (state: State) => state.setting.username;
export const getTemplateId = (state: State) => state.setting.templateId;
export const getEnabledNotifications = (state: State) =>
  state.setting.enabledNotifications;

export const getEditableSettings = createSelector(
  [getEnabledNotifications, getShowUploadHint, getShowTemplateHint],
  (enabledNotifications, showUploadHint, showTemplateHint) => {
    return {
      enabledNotifications,
      showUploadHint,
      showTemplateHint,
    };
  }
);

export const getLimsUrl = createSelector(
  [getLimsProtocol, getLimsHost, getLimsPort],
  (protocol: string, host: string, port: string) => {
    return `${protocol}://${host}:${port}`;
  }
);

import { find, map } from "lodash";
import { createLogic } from "redux-logic";

import {
  PREFERRED_TEMPLATE_ID,
  USER_SETTINGS_KEY,
} from "../../../shared/constants";
import { LimsUrl } from "../../../shared/types";
import { setAlert } from "../feedback/actions";
import {
  AlertType,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";

import {
  GATHER_SETTINGS,
  OPEN_ENVIRONMENT_DIALOG,
  UPDATE_SETTINGS,
} from "./constants";

export const updateSettingsLogic = createLogic({
  type: UPDATE_SETTINGS,
  validate: (
    { action, storage }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    try {
      // payload is a partial of the Setting State branch so it could be undefined.
      if (action.payload) {
        map(action.payload, (value: any, key: string) => {
          storage.set(`${USER_SETTINGS_KEY}.${key}`, value);
        });
        next(action);
      } else {
        reject({ type: "ignore" });
      }
    } catch (e) {
      next(
        batchActions([
          action,
          setAlert({
            message: "Failed to persist settings",
            type: AlertType.WARN,
          }),
        ])
      );
    }
  },
});

const gatherSettingsLogic = createLogic({
  validate: async (
    { action, logger, labkeyClient, storage }: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    try {
      // Anything in the userSettings object is considered environment-independent, meaning that
      // no matter what LIMS environment we're using or which user is "logged-in", these settings still apply.
      const userSettings = storage.get(USER_SETTINGS_KEY);
      if (!userSettings) {
        reject({ type: "ignore" });
        logger.debug("no user settings found");
        return;
      }

      // Template ID is environment-dependent (staging and production could have different sets of template ids)
      // so we need to get it from another place and add it manually.
      userSettings.templateId = storage.get(PREFERRED_TEMPLATE_ID);

      if (userSettings.templateId) {
        // Determine the most update to date template for the stored template ID
        const templates = await labkeyClient.getTemplates();
        const templateForStoredId = find(
          templates,
          (template) => userSettings.templateId === template["TemplateId"]
        );
        if (templateForStoredId) {
          let mostRecentlyCreatedTemplateForName = templateForStoredId;
          templates.forEach((template) => {
            if (
              template["Name"] === templateForStoredId["Name"] &&
              template["Version"] >
                mostRecentlyCreatedTemplateForName["Version"]
            ) {
              mostRecentlyCreatedTemplateForName = template;
            }
          });
          userSettings.templateId =
            mostRecentlyCreatedTemplateForName["TemplateId"];
        }
      }

      next({
        ...action,
        payload: userSettings,
      });
    } catch (e) {
      next(
        setAlert({
          message:
            "Failed to get saved settings. Falling back to default settings.",
          type: AlertType.WARN,
        })
      );
    }
  },
  type: GATHER_SETTINGS,
});

const openEnvironmentDialogLogic = createLogic({
  process: async (
    { dialog, storage, remote }: ReduxLogicProcessDependencies,
    dispatch,
    done
  ) => {
    const { response: buttonIndex } = await dialog.showMessageBox({
      buttons: ["Cancel", "Local", "Staging", "Production"],
      cancelId: 0,
      message: "Switch environment?",
      type: "question",
    });
    if (buttonIndex > 0) {
      const urlMap: { [index: number]: LimsUrl } = {
        1: {
          limsHost: "localhost",
          limsPort: "8080",
          limsProtocol: "http",
        },
        2: {
          limsHost: "stg-aics.corp.alleninstitute.org",
          limsPort: "80",
          limsProtocol: "http",
        },
        3: {
          limsHost: "aics.corp.alleninstitute.org",
          limsPort: "80",
          limsProtocol: "http",
        },
      };
      const env = urlMap[buttonIndex];
      // Persist selected environment to user settings
      try {
        Object.entries(env).map(([key, value]) =>
          storage.set(`${USER_SETTINGS_KEY}.${key}`, value)
        );
      } catch (e) {
        dispatch(
          setAlert({
            message: "Failed to persist settings",
            type: AlertType.WARN,
          })
        );
      }
      // Reload the app with the newly selected environment
      remote.getCurrentWindow().reload();
    }
    done();
  },
  type: OPEN_ENVIRONMENT_DIALOG,
});

export default [
  gatherSettingsLogic,
  openEnvironmentDialogLogic,
  updateSettingsLogic,
];

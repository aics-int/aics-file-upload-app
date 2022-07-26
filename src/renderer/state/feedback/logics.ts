import { createLogic } from "redux-logic";
import { gt } from "semver";

import ApplicationInfoService from "../../services/application-info";
import { clearTemplateDraft } from "../template/actions";
import {
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
} from "../types";

import { clearDeferredAction, setErrorAlert, setInfoAlert } from "./actions";
import { CHECK_FOR_UPDATE, CLOSE_MODAL } from "./constants";
import { getDeferredAction } from "./selectors";

const checkForUpdateLogic = createLogic({
  process: async (
    { applicationInfoService }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    try {
      const currentVersion = ApplicationInfoService.getApplicationVersion();
      const newestVersion = await applicationInfoService.getNewestApplicationVersion();
      if (gt(newestVersion, currentVersion)) {
        const downloadPage = "https://aics-int.github.io/aics-file-upload-app/";
        const message = `A new version of the application is available!<br/>
          Visit the <a href="${downloadPage}" target="_blank" title="File Upload App Confluence page">File Upload App Confluence page</a> to download.`;
        dispatch(setInfoAlert(message));
      }
    } catch (error) {
      dispatch(setErrorAlert(`Unable to check for updates: ${error.message}`));
    }
    done();
  },
  type: CHECK_FOR_UPDATE,
});

const closeModalLogic = createLogic({
  process: (
    { action, getState }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const deferredAction = getDeferredAction(getState());
    if (deferredAction) {
      dispatch(deferredAction);
    }
    dispatch(clearDeferredAction());
    if (action.payload === "templateEditor") {
      // Clear template draft any time the draft editor is closed
      dispatch(clearTemplateDraft());
    }
    done();
  },
  type: CLOSE_MODAL,
});

export default [checkForUpdateLogic, closeModalLogic];

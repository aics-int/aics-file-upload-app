import "core-js/es6/map";
import "core-js/es6/promise";
import "core-js/es6/set";
import FrontendInsights, {
  LogLevel,
  reduxMiddleware,
} from "@aics/frontend-insights";
import AmplitudeNodePlugin from "@aics/frontend-insights-plugin-amplitude-node";
import { remote } from "electron";
import * as Logger from "js-logger";
import * as React from "react";
import { render } from "react-dom";
import { Provider } from "react-redux";

import { APP_ID } from "./constants";
import App from "./containers/App";
import ApplicationInfoService from "./services/application-info";
import createReduxStore from "./state/configure-store";
import { setSwitchEnvEnabled } from "./state/route/logics";

// Application analytics/metrics
const frontendInsights = new FrontendInsights(
  {
    application: {
      name: "file-upload-application",
      version: ApplicationInfoService.getApplicationVersion(),
    },
    userInfo: {
      userId: ApplicationInfoService.getUserName(),
    },
    session: {
      platform: "Electron",
      deviceId: `${ApplicationInfoService.getUserName()}-${ApplicationInfoService.getOS()}`,
    },
    loglevel:
      process.env.NODE_ENV === "production" ? LogLevel.Error : LogLevel.Debug,
  },
  [
    new AmplitudeNodePlugin({
      apiKey: process.env.ELECTRON_WEBPACK_APP_AMPLITUDE_API_KEY,
    }),
  ]
);
frontendInsights.dispatchUserEvent({ type: "SESSION_START" });

const appContainer = document.getElementById(APP_ID);
render(
  <Provider
    store={createReduxStore({
      middleware: [reduxMiddleware(frontendInsights)],
    })}
  >
    <App />
  </Provider>,
  appContainer
);

// Prevent default behavior from div containing app and let app handle file drop
if (appContainer) {
  const returnFalse = () => false;
  appContainer.ondragover = returnFalse;
  appContainer.ondragleave = returnFalse;
  appContainer.ondragend = returnFalse;
  appContainer.ondrop = returnFalse;
}

const menu = remote.Menu.getApplicationMenu();
if (menu) {
  setSwitchEnvEnabled(menu, true, Logger);
}

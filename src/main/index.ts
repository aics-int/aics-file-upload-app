import * as path from "path";
import { format as formatUrl } from "url";

import { app, BrowserWindow, dialog, Event, ipcMain } from "electron";
import installExtension, { REACT_DEVELOPER_TOOLS } from "electron-devtools-installer";
import ElectronStore from "electron-store";
import { autoUpdater } from "electron-updater";
import 'source-map-support/register'

import {
  LIMS_PROTOCOL,
  MainProcessEvents,
  RendererProcessEvents,
} from "../shared/constants";

import { setMenu } from "./menu";

const isDevelopment = process.env.NODE_ENV !== "production";

ElectronStore.initRenderer();

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow: BrowserWindow | undefined;

function createMainWindow() {
  const window = new BrowserWindow({
    height: 750,
    webPreferences: {
      contextIsolation: false,
      // Allows us to load LabKey which uses jQuery which does not play well with NodeJS:
      // https://www.electronjs.org/docs/faq#i-can-not-use-jqueryrequirejsmeteorangularjs-in-electron
      nodeIntegration: true,
      // Disables same-origin policy and allows us to query Labkey
      webSecurity: false,
    },
    width: 1000,
  });
  window.maximize();

  // webContents allow us to send events to the renderer process
  const { webContents } = window;
  setMenu(webContents);

  if (isDevelopment) {
    installExtension(REACT_DEVELOPER_TOOLS)
      .then((name: string) => {
          console.log(`Added extension: ${name}`);

          if (!mainWindow) {
              throw new Error("mainWindow not defined");
          }

          mainWindow
              .loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`)
              .then(() => {
                  if (mainWindow) {
                      mainWindow.webContents.openDevTools();
                  }
              })
              .catch((error: Error) => {
                  console.error("Failed to load from webpack-dev-server", error);
              });
      })
      .catch((err: Error) =>
          console.error("An error occurred loading React Dev Tools: ", err)
      )
      .finally(() => window.webContents.openDevTools());
  } else {
    window.loadURL(
      formatUrl({
        pathname: path.join(__dirname, "index.html"),
        protocol: "file",
        slashes: true,
      })
    );
  }

  window.on("close", (e: Event) => {
    e.preventDefault();
    window.webContents.send(MainProcessEvents.SAFELY_CLOSE_WINDOW);
  });

  window.on("closed", () => {
    mainWindow = undefined;
  });

  window.webContents.on("devtools-opened", () => {
    window.focus();
    setImmediate(() => {
      window.focus();
    });
  });

  return window;
}

// This is a temporary fix for this issue: https://github.com/electron/electron/issues/23664
app.commandLine.appendSwitch("disable-features", "OutOfBlinkCors");

// quit application when all windows are closed
app.on("window-all-closed", () => {
  // on macOS it is common for applications to stay open until the user explicitly quits
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // on macOS it is common to re-create a window even after all windows have been closed
  if (mainWindow === null) {
    mainWindow = createMainWindow();
  }
});

// create main BrowserWindow when electron is ready
app.on("ready", () => {
  mainWindow = createMainWindow();
  autoUpdater.checkForUpdatesAndNotify();
});

ipcMain.on(RendererProcessEvents.CLOSE_WINDOW, () => {
  app.exit();
});

ipcMain.on(
  RendererProcessEvents.OPEN_CREATE_PLATE_STANDALONE,
  (
    event: any,
    limsHost: string,
    limsPort: string,
    barcode: string,
    prefix: string,
    uploadKey: string
  ) => {
    const child: BrowserWindow = new BrowserWindow({
      parent: mainWindow,
      show: false,
      webPreferences: {
        nodeIntegration: false,
      },
    });
    const plateView = `/labkey/aics_microscopy/AICS/plateStandalone.view?Barcode=${barcode}`;
    // We can't modify the environment variables this would normally get the host and port from because it is in a
    // different process, similarly we are unable to access the state to get the most current so we need to rely on
    // being given them
    let modalUrl = `${LIMS_PROTOCOL}://${limsHost}:${limsPort}${plateView}`;
    if (prefix === "AX" || prefix === "AD") {
      modalUrl = `${modalUrl}&TeamMode=AssayDev`;
    }
    child.loadURL(modalUrl);
    child.once("ready-to-show", () => {
      child.show();
    });
    child.webContents.on("will-navigate", (e: Event, next: string) => {
      if (!next.includes("plateStandalone.view")) {
        e.preventDefault();
        const childURL = new URL(child.webContents.getURL());
        const imagingSessionId = new URLSearchParams(childURL.search).get(
          "ImagingSessionId"
        );
        event.sender.send(
          MainProcessEvents.PLATE_CREATED,
          uploadKey,
          barcode,
          imagingSessionId
        );
        child.close();
      }
    });
  }
);

ipcMain.on(RendererProcessEvents.REFRESH, () => {
  const currentWindow = BrowserWindow.getFocusedWindow();
  if (currentWindow) {
    currentWindow.reload();
  }
});

ipcMain.handle(
  RendererProcessEvents.SHOW_DIALOG,
  async (_, options: Electron.OpenDialogOptions) => {
    const currentWindow = BrowserWindow.getFocusedWindow();
    if (!currentWindow) {
      return undefined;
    }
    const { filePaths } = await dialog.showOpenDialog(currentWindow, options);
    return filePaths;
  }
);

ipcMain.handle(
  RendererProcessEvents.SHOW_MESSAGE_BOX,
  async (_, options: Electron.MessageBoxOptions) => {
    const currentWindow = BrowserWindow.getFocusedWindow();
    if (!currentWindow) {
      return undefined;
    }
    const { response: buttonIndex } = await dialog.showMessageBox(
      currentWindow,
      options
    );
    return buttonIndex;
  }
);

ipcMain.on(
  RendererProcessEvents.SHOW_SAVE_DIALOG,
  async (_, options: Electron.SaveDialogOptions) => {
    const currentWindow = BrowserWindow.getFocusedWindow();
    if (!currentWindow) {
      return undefined;
    }
    const { filePath } = await dialog.showSaveDialog(currentWindow, options);
    return filePath;
  }
);

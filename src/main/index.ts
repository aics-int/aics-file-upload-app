import { FileManagementSystem } from "@aics/aicsfiles";
import { Uploads } from "@aics/aicsfiles/type-declarations/types";
import { app, BrowserWindow, Event, ipcMain } from "electron";
import Logger from "js-logger";
import * as path from "path";
import { format as formatUrl } from "url";

import {
    LIMS_HOST,
    LIMS_PORT,
    LIMS_PROTOCOL,
    OPEN_CREATE_PLATE_STANDALONE,
    PLATE_CREATED,
    START_UPLOAD,
    UPLOAD_FAILED,
    UPLOAD_FINISHED,
} from "../shared/constants";

const isDevelopment = process.env.NODE_ENV !== "production";

// global reference to mainWindow (necessary to prevent window from being garbage collected)
let mainWindow: BrowserWindow | undefined;

function createMainWindow() {
    const window = new BrowserWindow({
        height: 750,
        webPreferences: {
            // Disables same-origin policy and allows us to query Labkey
            webSecurity: false,
        },
        width: 1000,
    });

    if (isDevelopment) {
        window.webContents.openDevTools();
    }

    if (isDevelopment) {
        window.loadURL(`http://localhost:${process.env.ELECTRON_WEBPACK_WDS_PORT}`);
    } else {
        window.loadURL(formatUrl({
            pathname: path.join(__dirname, "index.html"),
            protocol: "file",
            slashes: true,
        }));
    }

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
});

const startUpload = async (event: Event, uploads: Uploads) => {
    Logger.debug("received start upload request from renderer");
    const uploadClient = new FileManagementSystem(LIMS_HOST, LIMS_PORT, "debug");
    try {
        const result = await uploadClient.uploadFiles(uploads);
        event.sender.send(UPLOAD_FINISHED, result);
    } catch (e) {
        Logger.error(e.message);
        event.sender.send(UPLOAD_FAILED, e.message);
    }
};

ipcMain.on(START_UPLOAD, startUpload);

ipcMain.on(OPEN_CREATE_PLATE_STANDALONE, (event: any) => {
    const child: BrowserWindow = new BrowserWindow({
        modal: true,
        parent: mainWindow,
        show: false,
        webPreferences: {
            nodeIntegration: false,
        },
    });
    const modalUrl = `${LIMS_PROTOCOL}://${LIMS_HOST}:${LIMS_PORT}/labkey/aics_microscopy/AICS/plateStandalone.view`;
    child.loadURL(modalUrl);
    child.once("ready-to-show", () => {
        child.show();
    });
    child.webContents.on("will-navigate", (e: Event, next: string) => {
        // tslint:disable-next-line
        console.log("will navigate", next);
        if (next.indexOf("plateStandalone.view") === -1) {
            e.preventDefault();
            // todo once redirect URL on CreatePlateStandalone includes barcode and plateId, parse these values
            // and include below
            event.sender.send(PLATE_CREATED, "barcode", 789);
            child.close();
        }
    });
});

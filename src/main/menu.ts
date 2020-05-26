import electron, { dialog, Menu, shell } from "electron";

import {
  OPEN_OPEN_TEMPLATE_MODAL,
  OPEN_OPEN_UPLOAD_MODAL,
  OPEN_SETTINGS_EDITOR,
  OPEN_TEMPLATE_EDITOR,
  SAVE_UPLOAD,
  SCHEMA_SYNONYM,
  SWITCH_ENVIRONMENT,
} from "../shared/constants";
import BrowserWindow = Electron.BrowserWindow;
import MenuItemConstructorOptions = Electron.MenuItemConstructorOptions;
import WebContents = Electron.WebContents;
import MenuItem = Electron.MenuItem;

const separatorOption: MenuItemConstructorOptions = { type: "separator" };
const app = electron.app;
const isMac = process.platform === "darwin";

/**
 * Create App Menu
 * @param webContents WebContents object from main BrowserWindow. Used for sending events to renderer process.
 */
export const setMenu = (webContents: WebContents) => {
  const template = ([
    ...(isMac
      ? [
          {
            label: app.getName(),
            submenu: [
              { role: "about" },
              separatorOption,
              { role: "services" },
              separatorOption,
              { role: "hide" },
              { role: "hideothers" },
              { role: "unhide" },
              separatorOption,
              { role: "quit" },
            ],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "New",
          submenu: [
            {
              click: () => webContents.send(OPEN_TEMPLATE_EDITOR),
              label: SCHEMA_SYNONYM,
            },
          ],
        },
        {
          label: "Open",
          submenu: [
            {
              click: () => webContents.send(OPEN_OPEN_UPLOAD_MODAL),
              label: "Upload Draft",
            },
            {
              click: () => webContents.send(OPEN_OPEN_TEMPLATE_MODAL),
              label: SCHEMA_SYNONYM,
            },
          ],
        },
        { type: "separator" },
        {
          click: () => webContents.send(SAVE_UPLOAD),
          label: "Save",
        },
        { type: "separator" },
        {
          click: () => webContents.send(OPEN_SETTINGS_EDITOR),
          label: "Settings",
        },
        { type: "separator" },
        {
          click: () => webContents.send(SWITCH_ENVIRONMENT),
          enabled: true,
          label: "Switch environment",
        },
        isMac ? { role: "close" } : { role: "quit" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          role: "cut",
        },
        {
          role: "copy",
        },
        {
          role: "paste",
        },
      ],
    },
    {
      label: "View",
      submenu: [
        {
          accelerator: "CmdOrCtrl+R",
          click: (item: any, focusedWindow: BrowserWindow) => {
            if (focusedWindow) {
              focusedWindow.reload();
            }
          },
          label: "Reload",
        },
        {
          accelerator:
            process.platform === "darwin" ? "Alt+Command+I" : "Ctrl+Shift+I",
          click: (item: any, focusedWindow: BrowserWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.toggleDevTools();
            }
          },
          label: "Toggle Developer Tools",
        },
        separatorOption,
        {
          role: "togglefullscreen",
        },
      ],
    },
    {
      role: "window",
      submenu: [
        {
          role: "minimize",
        },
        {
          role: "close",
        },
      ],
    },
    {
      role: "help",
      submenu: [
        {
          click: () => {
            shell.openExternal(
              "http://confluence.corp.alleninstitute.org/display/SF/Information+for+Alpha+Users"
            );
          },
          label: "Learn More",
        },
        {
          click: () => {
            dialog.showMessageBox({
              buttons: ["OK"],
              message: `Version: ${app.getVersion()}`,
              title: app.getName(),
              type: "info",
            });
          },
          label: "About " + app.getVersion(),
        },
      ],
    },
  ] as any) as Array<MenuItemConstructorOptions | MenuItem>;
  // Casting is necessary to avoid having to cast each role value from string to a union string type
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};

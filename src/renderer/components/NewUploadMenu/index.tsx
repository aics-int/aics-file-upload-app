import { ipcRenderer, OpenDialogOptions } from "electron";
import * as React from "react";

import { RendererProcessEvents } from "../../../shared/constants";

const styles = require("./styles.pcss");

const OPEN_FILES_DIALOG_OPTIONS: OpenDialogOptions = {
  properties: ["openFile", "multiSelections"],
  title: "Browse for files to upload",
};

const OPEN_FOLDER_DIALOG_OPTIONS: OpenDialogOptions = {
  properties: ["openDirectory"],
  title: "Browse for a folder of files to upload",
};

interface Props {
  onUploadWithTemplate: () => void;
  onUploadWithoutTemplate: (filePaths: string[], isMultifile: boolean) => void;
}

export default function NewUploadMenu(props: Props) {
  async function openFileBrowser(dialogOptions: OpenDialogOptions, isMultifile: boolean) {
    const filePaths = await ipcRenderer.invoke(
      RendererProcessEvents.SHOW_DIALOG,
      dialogOptions
    );
    props.onUploadWithoutTemplate(filePaths, isMultifile);
  }

  return (
    <div className={styles.menu}>
      <div className={styles.menuDivider}>Upload Without Metadata Template</div>
      <div
        className={styles.menuItem}
        onClick={() => openFileBrowser(OPEN_FILES_DIALOG_OPTIONS, false)}
      >
        Files
      </div>
      <div
        className={styles.menuItem}
        onClick={() => openFileBrowser(OPEN_FOLDER_DIALOG_OPTIONS, false    )}
      >
        Folder
      </div>
      <div className={styles.menuItem} onClick={() => openFileBrowser(OPEN_FOLDER_DIALOG_OPTIONS, true)}>
        Multifile (SLDY, Zarr, etc.)
      </div>
      <div className={styles.menuDivider}>Upload With Metadata Template</div>
      <div className={styles.menuItem} onClick={props.onUploadWithTemplate}>
        Files
      </div>
      <div className={styles.menuItem} onClick={props.onUploadWithTemplate}>
        Folder
      </div>
      <div className={styles.menuItem} onClick={props.onUploadWithTemplate}>
        Multifile (SLDY, Zarr, etc.)
      </div>
    </div>
  );
}

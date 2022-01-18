import { Button } from "antd";
import { ipcRenderer, OpenDialogOptions } from "electron";
import { isEmpty } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { RendererProcessEvents } from "../../../../shared/constants";
import { loadFiles } from "../../../state/selection/actions";
import { getIsExistingUpload } from "../../../state/selection/selectors";

const styles = require("./styles.pcss");

const openDialogOptions: OpenDialogOptions = {
  properties: ["openFile", "multiSelections"],
  title: "Browse for files, or drag and drop files/folders onto app",
};

/*
  TableFooter is used to display an interactive prompt for users
  to drag and drop or browse for additional files to upload.
*/
export default function TableFooter() {
  const dispatch = useDispatch();
  const isExistingUpload = useSelector(getIsExistingUpload);

  if (isExistingUpload) {
    return null;
  }

  async function openFileBrowser() {
    const filePaths = await ipcRenderer.invoke(
      RendererProcessEvents.SHOW_DIALOG,
      openDialogOptions
    );

    // If cancel is clicked, this callback gets called and filenames is undefined
    if (!isEmpty(filePaths)) {
      dispatch(loadFiles(filePaths));
    }
  }

  return (
    <div className={styles.tableFooter}>
      Drag and Drop -or-
      <Button onClick={openFileBrowser} size="small">
        browse
      </Button>
      for additional files
    </div>
  );
}

import { UploadOutlined } from "@ant-design/icons";
import { OpenDialogOptions, ipcRenderer } from "electron";
import { isEmpty } from "lodash";
import React, { useState } from "react";
import { useSelector } from "react-redux";

import { RendererProcessEvents } from "../../../../shared/constants";
import { getUploadType } from "../../../state/selection/selectors";
import { UploadType } from "../../../types";

const styles = require("./styles.pcss");

interface DragAndDropPromptProps {
  openDialogOptions: OpenDialogOptions;
  onDrop: (files: Array<string | { path: string; name: string }>) => void;
  uploadType: UploadType;
}

export default function DragAndDropPrompt(props: DragAndDropPromptProps) {
  const uploadType = useSelector(getUploadType);

  const [filePath, setFilePath] = useState("");
  const [fileName, setFileName] = useState("");

  const isManualInputEnabled =
    String(process.env.ENABLE_MANUAL_FILE_INPUT).toLowerCase() === "true";

  const handleFileNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFileName(event.target.value);
  };

  const handleFilePathChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilePath(event.target.value);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedPath = filePath.trim();
    const trimmedName = fileName.trim();
    if (trimmedPath) {
      props.onDrop([{ path: trimmedPath, name: trimmedName }]);
    }
  };

  const onBrowse = async () => {
    const filePaths = await ipcRenderer.invoke(
      RendererProcessEvents.SHOW_DIALOG,
      props.openDialogOptions
    );

    // If cancel is clicked, this callback gets called and filePaths is undefined
    if (filePaths && !isEmpty(filePaths)) {
      props.onDrop(filePaths);
    }
  };

  return (
    <div className={styles.content}>
      <h1 className={styles.header}>Select {uploadType}(s) to upload</h1>
      <div className={styles.dropZone} onClick={onBrowse}>
        <UploadOutlined className={styles.uploadIcon} />
        <div>Drag&nbsp;and&nbsp;Drop</div>
        <div className={styles.dropZoneHelpText}>or click to browse files</div>
      </div>
      {isManualInputEnabled && (
        <form className={styles.manualInput} onSubmit={handleSubmit}>
          <label className={styles.manualInputLabel} htmlFor="manualFileInput">
            FMS File Name:
          </label>
          <input
            id="manualFileInput"
            name="manualFileInput"
            className={styles.manualInputField}
            onChange={handleFileNameChange}
            value={fileName}
            placeholder="Enter a full file path and press Enter"
          />
          <br />
          <label className={styles.manualInputLabel} htmlFor="manualFileInput">
            VAST File Path:
          </label>
          <input
            id="manualFileInput"
            name="manualFileInput"
            className={styles.manualInputField}
            onChange={handleFilePathChange}
            value={filePath}
            placeholder="Enter a full file path and press Enter"
          />
          <br />
          <button
            type="submit"
            className={styles.manualInputButton}
            disabled={!filePath.trim() || !fileName.trim()}
            title={
              !filePath.trim() || !fileName.trim()
                ? "Enter a valid path and name to enable"
                : "Submit Upload"
            }
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}

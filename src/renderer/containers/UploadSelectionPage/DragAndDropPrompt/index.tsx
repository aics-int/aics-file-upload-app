import { UploadOutlined } from "@ant-design/icons";
import { OpenDialogOptions, ipcRenderer } from "electron";
import { isEmpty } from "lodash";
import React, { useState } from "react";
import { useSelector } from "react-redux";

import { RendererProcessEvents } from "../../../../shared/constants";
import { getUploadType } from "../../../state/selection/selectors";
import { UploadType } from "../../../types";

const styles = require("./styles.pcss");

interface DragAndDropPromptProps {  openDialogOptions: OpenDialogOptions;onDrop: (files: string[]) => void;uploadType: UploadType;
}

export default function DragAndDropPrompt(props: DragAndDropPromptProps) {
  const uploadType = useSelector(getUploadType);

  const [inputValue, setInputValue] = useState("");

  const isManualInputEnabled =
    String(process.env.ENABLE_MANUAL_FILE_INPUT).toLowerCase() === "true";

  // Define the onChange handler function
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    // Update the state with the new value from the input field
    setInputValue(event.target.value);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed) {
      props.onDrop([trimmed]);
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
            Dev file path override
          </label>
          <input
            id="manualFileInput"
            name="manualFileInput"
            className={styles.manualInputField}
            onChange={handleChange}
            value={inputValue}
            placeholder="Enter a full file path and press Enter"
          />
          <button
            type="submit"
            className={styles.manualInputButton}
            disabled={!inputValue.trim()}
            title={
              !inputValue.trim()
                ? "Enter a valid path to enable"
                : "Submit path"
            }
          >
            Submit
          </button>
        </form>
      )}
    </div>
  );
}

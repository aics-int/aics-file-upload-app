import { UploadOutlined } from '@ant-design/icons';
import { OpenDialogOptions, ipcRenderer } from "electron";
import { isEmpty } from "lodash";
import React, {useState} from 'react';
import { useSelector } from 'react-redux';

import { RendererProcessEvents } from '../../../../shared/constants';
import { getUploadType } from '../../../state/selection/selectors';
import { UploadType } from '../../../types';

const styles = require("./styles.pcss");

interface DragAndDropPromptProps {
    openDialogOptions: OpenDialogOptions;
    onDrop: (files: string[]) => void;
    uploadType: UploadType
}

export default function DragAndDropPrompt(props: DragAndDropPromptProps) {
    const uploadType = useSelector(getUploadType);

    const [inputValue, setInputValue] = useState('');

    // Define the onChange handler function
    const handleChange = (event) => {
        // Update the state with the new value from the input field
        setInputValue(event.target.value);
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
            <label>
                Dev file path override: <input name="manualFileInput" onChange={handleChange}/>
            </label>
            <button onClick={() => props.onDrop([inputValue])}>
                Submit
            </button>
        </div>
    );
}
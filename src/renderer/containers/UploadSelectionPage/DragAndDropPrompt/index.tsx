import { UploadOutlined } from '@ant-design/icons';
import { OpenDialogOptions, ipcRenderer } from "electron";
import { isEmpty } from "lodash";
import React from 'react';

import { RendererProcessEvents } from '../../../../shared/constants';
import { UploadType } from '../../../types';
import { useSelector } from 'react-redux';
import { getUploadType } from '../../../state/selection/selectors';

const styles = require("./styles.pcss");

interface DragAndDropPromptProps {
    openDialogOptions: OpenDialogOptions;
    onDrop: (files: string[]) => void;
    uploadType: UploadType
}

export default function DragAndDropPrompt(props: DragAndDropPromptProps) {
    const uploadType = useSelector(getUploadType);

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
            <div className={styles.dropZoneHelpText}>or click to browse file paths</div>
          </div>
        </div>
    );
}
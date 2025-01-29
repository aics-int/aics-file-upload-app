import { UploadOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { OpenDialogOptions, ipcRenderer } from "electron";
import { isEmpty } from "lodash";
import React from 'react';

import { RendererProcessEvents } from '../../../../shared/constants';
import { UploadType } from '../../../types';

const styles = require("./styles.pcss");

interface DragAndDropPromptProps {
    openDialogOptions: OpenDialogOptions;
    onDrop: (files: string[]) => void;
    uploadType: UploadType
}

export default function DragAndDropPrompt(props: DragAndDropPromptProps) {

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

    let helpText: string | null = null;
    if (props.uploadType) {
      helpText = props.uploadType === UploadType.File
        ? "Accepted file formats include: .csv, .jpeg, ..."
        : "Accepted file formats include: .zarr, .sldy, ..."
    }

    return (
        <div className={styles.content}>
          <h1 className={styles.header}>Select file(s) to upload</h1>
          <div className={styles.dropZone} onClick={onBrowse}>
            <UploadOutlined className={styles.uploadIcon} />
            <div>Drag&nbsp;and&nbsp;Drop</div>
            <div className={styles.dropZoneHelpText}>{helpText}</div>
          </div>
          <Button className={styles.dropZoneBrowseButton} disabled={!props.openDialogOptions} onClick={onBrowse}>
            Browse Files
          </Button>
        </div>
    );
}
import { OpenDialogOptions } from "electron";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Button } from 'antd';

import DragAndDrop from "../../components/DragAndDrop";
import { loadFiles } from "../../state/selection/actions";
import {
  getUploadType,
} from "../../state/selection/selectors";
import {
  getUploadAsTableRows
} from "../../state/upload/selectors";

import UploadTypeSelector from "./UploadTypeSelector";
import DragAndDropPrompt from "./DragAndDropPrompt";
import SelectedFilesList from "./SelectedFilesList";
import { closeUpload, selectPage } from "../../state/route/actions";
import { Page } from "../../state/types";
import PageFooter from "../../components/PageFooter";
import { UploadType } from "../../state/selection/types";

const styles = require("./styles.pcss");

/**
 * Component responsible for rendering a page the user can use to
 * input user-defined metadata and submit the files for upload.
 */
export default function UploadSelectionPage() {
  const dispatch = useDispatch();

  const uploadType = useSelector(getUploadType);
  const uploadList = useSelector(getUploadAsTableRows);

  // Default to "File" option
  let openDialogOptions: OpenDialogOptions = {
    properties: ["openFile", "multiSelections"],
    title: "Browse for files",
  }
  if (uploadType === UploadType.Multifile) {
    openDialogOptions = {
      properties: ["openDirectory", "multiSelections"],
      title: "Browse for multifiles",
    }
  }

  const onCancel = () => {
      dispatch(closeUpload());
  }

  const onContinue = () => {
      dispatch(selectPage(Page.AddMetadata));
  }

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <UploadTypeSelector />
        {uploadType !== null && 
          <DragAndDrop
            onDrop={(f) => {dispatch(loadFiles(f))}}
            uploadType={uploadType}
          >
            <DragAndDropPrompt
              openDialogOptions={openDialogOptions}
              onDrop={(f) => {dispatch(loadFiles(f))}}
              uploadType={uploadType}
            />
          </DragAndDrop>
        }
        {
          (uploadType !== null && uploadList.length > 0) && (
            <SelectedFilesList uploadList={uploadList} />
          )
        }
        <PageFooter>
          <Button
              className={styles.footerButton}
              onClick={onCancel}
          >
              Cancel Upload
          </Button>
          <Button
              className={styles.footerButton}
              onClick={onContinue}
              disabled={uploadList.length === 0}
              type="primary"
          >
              Continue to Metadata
          </Button>
        </PageFooter>
      </div>
    </div>
  );
}

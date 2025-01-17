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

const styles = require("./styles.pcss");

// TODO: These should be conditional based on "UploadType"
// TODO: This should probably just be in the <DragAndDropPrompt /> component?
const openDialogOptions: OpenDialogOptions = {
  properties: ["openFile", "multiSelections"],
  title: "Browse for files, or drag and drop files/folders onto app",
};

/**
 * Component responsible for rendering a page the user can use to
 * input user-defined metadata and submit the files for upload.
 */
export default function UploadSelectionPage() {
  const dispatch = useDispatch();

  const uploadType = useSelector(getUploadType);
  const uploadList = useSelector(getUploadAsTableRows);

  const onCancel = () => {
      dispatch(closeUpload());
  }

  const onContinue = () => {
      // TODO: error checking?
      dispatch(selectPage(Page.AddMetadata));
  }

  return (
    <div className={styles.newContentContainer}>
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
            onClick={onContinue}
            disabled={uploadList.length === 0}
            type="primary"
        >
            Continue to Metadata
        </Button>
        <Button
            className={styles.footerButton}
            onClick={onCancel}
        >
            Cancel Upload
        </Button>
      </PageFooter>
    </div>
  );
}

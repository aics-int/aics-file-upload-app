import { Button, Tooltip } from "antd";
import { OpenDialogOptions } from "electron";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import DragAndDrop from "../../components/DragAndDrop";
import PageFooter from "../../components/PageFooter";
import { getIsAnyMetadataExtractionLoading } from "../../state/metadataExtraction/selectors";
import { closeUpload, selectPage } from "../../state/route/actions";
import { loadFiles } from "../../state/selection/actions";
import { getUploadType } from "../../state/selection/selectors";
import { Page } from "../../state/types";
import { getUploadAsTableRows } from "../../state/upload/selectors";
import { UploadType } from "../../types";

import DragAndDropPrompt from "./DragAndDropPrompt";
import SelectedFilesList from "./SelectedFilesList";
import UploadTypeSelector from "./UploadTypeSelector";

const styles = require("./styles.pcss");

/**
 * Component responsible for rendering a page the user can use to
 * input user-defined metadata and submit the files for upload.
 */
export default function UploadSelectionPage() {
  const dispatch = useDispatch();

  const isMxsLoading = useSelector(getIsAnyMetadataExtractionLoading);
  const uploadType = useSelector(getUploadType);
  const uploadList = useSelector(getUploadAsTableRows);

  // Default to "File" option
  let openDialogOptions: OpenDialogOptions = {
    properties: ["openFile", "multiSelections"],
    title: `Browse for ${UploadType.File}s`,
  };
  if (uploadType === UploadType.Multifile) {
    openDialogOptions = {
      properties: ["openDirectory", "multiSelections"],
      title: `Browse for ${UploadType.Multifile}s`,
    };
  }

  const onCancel = () => {
    dispatch(closeUpload());
  };

  const onContinue = () => {
    dispatch(selectPage(Page.AddMetadata));
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <UploadTypeSelector />
        {uploadType !== null && (
          <DragAndDrop
            onDrop={(f) => {
              dispatch(loadFiles(f));
            }}
            uploadType={uploadType}
          >
            <DragAndDropPrompt
              openDialogOptions={openDialogOptions}
              onAddFile={(f) => {
                dispatch(loadFiles(f));
              }}
              uploadType={uploadType}
            />
          </DragAndDrop>
        )}
        {uploadType !== null && uploadList.length > 0 && (
          <SelectedFilesList uploadList={uploadList} />
        )}
        <PageFooter>
          <Button className={styles.footerButton} danger onClick={onCancel}>
            Cancel Upload
          </Button>
          <Tooltip
            title={isMxsLoading ? "Waiting on data from MXS" : undefined}
          >
            <span>
              <Button
                className={styles.footerButton}
                onClick={onContinue}
                disabled={uploadList.length === 0 || isMxsLoading}
                type="primary"
              >
                Continue to Metadata
              </Button>
            </span>
          </Tooltip>
        </PageFooter>
      </div>
    </div>
  );
}

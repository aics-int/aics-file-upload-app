import { Button, Icon } from "antd";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { closeUpload } from "../../../state/route/actions";
import { getSelectedUploads } from "../../../state/selection/selectors";
import {
  initiateUpload,
  submitFileMetadataUpdate,
} from "../../../state/upload/actions";
import { getUploadValidationErrors } from "../../../state/upload/selectors";
import { getCanSubmitUpload } from "../selectors";

const styles = require("./style.pcss");

interface Props {
  onSubmit: () => void;
}

/**
 * TODO
 */
export default function PageFooter(props: Props) {
  const dispatch = useDispatch();

  const canSubmit = useSelector(getCanSubmitUpload);
  const selectedUploads = useSelector(getSelectedUploads);
  const isUploadInProgress = useSelector(getIsUploadInProgress);
  const validationErrors = useSelector(getUploadValidationErrors);

  function onSubmit() {
    props.onSubmit();

    if (validationErrors.length) {
      if (selectedUploads.length) {
        dispatch(submitFileMetadataUpdate());
      } else {
        dispatch(initiateUpload());
      }
    }
  }

  return (
    <div className={styles.saveButtonContainer}>
      <Button
        className={styles.cancelButton}
        size="large"
        onClick={() => dispatch(closeUpload())}
      >
        Cancel
      </Button>
      <Button
        type="primary"
        size="large"
        onClick={onSubmit}
        disabled={!canSubmit}
      >
        {isUploadInProgress ? (
          <>
            Loading&nbsp;
            <Icon type="loading" className={styles.loading} spin={true} />
          </>
        ) : selectedUploads.length ? (
          "Update"
        ) : (
          "Upload"
        )}
      </Button>
    </div>
  );
}

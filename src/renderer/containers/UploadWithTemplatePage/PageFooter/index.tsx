import { LoadingOutlined } from "@ant-design/icons";
import { Button, Checkbox } from "antd";
import { CheckboxChangeEvent } from "antd/es/checkbox";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { closeUpload } from "../../../state/route/actions";
import { getSelectedUploads } from "../../../state/selection/selectors";
import { getShouldStoreLocally } from "../../../state/setting/selectors";
import {
  initiateUpload,
  submitFileMetadataUpdate,
  setShouldStoreLocally,
} from "../../../state/upload/actions";
import {
  getUploadValidationErrors,
} from "../../../state/upload/selectors";
import { getCanSubmitUpload, getIsUploadInProgress } from "../selectors";

const styles = require("./styles.pcss");

interface Props {
  onSubmit: () => void;
}

/**
 * Component responsible for rendering the button footer of the
 * UploadWithTemplatePage.
 */
export default function PageFooter(props: Props) {
  const dispatch = useDispatch();

  const canSubmit = useSelector(getCanSubmitUpload);
  const selectedUploads = useSelector(getSelectedUploads);
  const isUploadInProgress = useSelector(getIsUploadInProgress);
  const validationErrors = useSelector(getUploadValidationErrors);
  const shouldStoreLocally = useSelector(getShouldStoreLocally);

  function onSubmit() {
    props.onSubmit();

    if (!validationErrors.length) {
      if (selectedUploads.length) {
        dispatch(submitFileMetadataUpdate());
      } else {
        dispatch(initiateUpload());
      }
    }
  }

  // Handler to update shouldStoreLocally state when the checkbox is toggled
  const onCheckboxChange = (e: CheckboxChangeEvent) => {
    dispatch(setShouldStoreLocally(e.target.checked));
  };

  return (
    <div className={styles.pageFooter}>
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
            <LoadingOutlined spin={true} />
          </>
        ) : selectedUploads.length ? (
          "Update"
        ) : (
          "Upload"
        )}
      </Button>
      <Checkbox
        checked={shouldStoreLocally}
        onChange={onCheckboxChange} // Update Redux state on change
        style={{ marginLeft: 16 }}
      >
        Store Locally
      </Checkbox>
    </div>
  );
}

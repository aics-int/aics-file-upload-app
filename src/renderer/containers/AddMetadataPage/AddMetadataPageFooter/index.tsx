import { LoadingOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { Button, Switch, Tooltip } from "antd";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { closeUpload, selectPage } from "../../../state/route/actions";
import { getSelectedUploads, getShouldBeInLocal } from "../../../state/selection/selectors";
import {
  initiateUpload,
  submitFileMetadataUpdate,
  setShouldBeInLocal,
} from "../../../state/upload/actions";
import {
  getUploadValidationErrors,
} from "../../../state/upload/selectors";
import { getCanSubmitUpload, getIsUploadInProgress } from "../../UploadSelectionPage/selectors";
import PageFooter from "../../../components/PageFooter";
import { Page } from "../../../state/types";

const styles = require("./styles.pcss");

interface Props {
  onSubmit: () => void;
}

/**
 * Component responsible for rendering the button footer of the
 * UploadSelectionPage.
 */
export default function AddMetadataPageFooter(props: Props) {
  const dispatch = useDispatch();

  const canSubmit = useSelector(getCanSubmitUpload);
  const selectedUploads = useSelector(getSelectedUploads);
  const isUploadInProgress = useSelector(getIsUploadInProgress);
  const validationErrors = useSelector(getUploadValidationErrors);
  const ShouldBeInLocal = useSelector(getShouldBeInLocal);

  const onCancel = () => {
    dispatch(closeUpload());
  }

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

  // Handler to update ShouldBeInLocal state when the switch is toggled
  const onSwitchChange = (checked: boolean) => {
    dispatch(setShouldBeInLocal(!checked));
  };

  return (
    <PageFooter>
      <Button
              className={styles.cancelButton}
              onClick={onCancel}
          >
              Cancel Upload
          </Button>
      <Button
        className={styles.cancelButton}
        onClick={() => dispatch(selectPage(Page.UploadWithTemplate))}
      >
        Add More Files
      </Button>
      <Button
        type="primary"
        onClick={onSubmit}
        disabled={!canSubmit}
        className={styles.uploadButton}
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
      <div className={styles.checkboxContainer}>
        <Switch
          checked={!ShouldBeInLocal}
          onChange={onSwitchChange}
          checkedChildren="On"
          unCheckedChildren="Off"
        />
        <span style={{ marginLeft: 8 }}>Only store on cloud</span>
        <Tooltip title="By default, files are stored both locally on the VAST and in the cloud. Storing only in the cloud preserves on prem storage space.">
          <InfoCircleOutlined className={styles.iconBrandPrimary} style={{ marginLeft: 4 }} />
        </Tooltip>
      </div>
    </PageFooter>
  );
}

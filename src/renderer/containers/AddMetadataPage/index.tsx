import React from 'react';
import { Alert, Spin } from "antd";
import { ipcRenderer } from "electron";
import { useDispatch, useSelector } from "react-redux";

import { MainProcessEvents, SCHEMA_SYNONYM } from "../../../shared/constants";
import LabeledInput from "../../components/LabeledInput";
import TemplateSearch from "../../components/TemplateSearch";
import { AnnotationName } from "../../constants";
import {
  getIsLoading,
  getRequestsInProgress,
  getUploadError,
} from "../../state/feedback/selectors";
import { getImagingSessions } from "../../state/metadata/selectors";
import {
  getAreSelectedUploadsInFlight,
  getSelectedUploads,
} from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { AsyncRequest } from "../../state/types";
import { applyTemplate, updateUpload } from "../../state/upload/actions";
import {
  getUploadAsTableRows,
  getUploadValidationErrors,
} from "../../state/upload/selectors";

import CustomDataTable from '../CustomDataTable';
import AddMetadataPageFooter from './AddMetadataPageFooter';

const styles = require("./styles.pcss");


export default function AddMetadataPage() {
    const dispatch = useDispatch();

    const appliedTemplate = useSelector(getAppliedTemplate);
    const imagingSessions = useSelector(getImagingSessions);
    const isReadOnly = useSelector(getAreSelectedUploadsInFlight);
    const requestsInProgress = useSelector(getRequestsInProgress);
    const uploadError = useSelector(getUploadError);
    const validationErrors = useSelector(getUploadValidationErrors);

    const [hasAttemptedSubmit, setHasAttemptedSubmit] = React.useState(false);

    const isTemplateLoading = requestsInProgress.includes(
      AsyncRequest.GET_TEMPLATE
    );
    const isSelectedJobLoading = requestsInProgress.includes(
      AsyncRequest.GET_FILE_METADATA_FOR_JOB
    );
  
    // Listen for barcode creation events
    React.useEffect(() => {
      ipcRenderer.on(
        MainProcessEvents.PLATE_CREATED,
        (_, uploadKey, barcode, imagingSessionId) => {
          const imagingSession = imagingSessions.find(
            (is) => is.imagingSessionId === imagingSessionId
          );
          dispatch(
            updateUpload(uploadKey, {
              [AnnotationName.PLATE_BARCODE]: [barcode],
              [AnnotationName.IMAGING_SESSION]: imagingSession
                ? [imagingSession.name]
                : [],
            })
          );
        }
      );
  
      return function cleanUp() {
        ipcRenderer.removeAllListeners(MainProcessEvents.PLATE_CREATED);
      };
    }, [dispatch, imagingSessions]);

    return (
        <>
            <div className={styles.contentContainer}>
            {!isSelectedJobLoading && (
            <>
                {hasAttemptedSubmit && !appliedTemplate && (
                <Alert
                    className={styles.alert}
                    message="Please select a template."
                    type="error"
                    showIcon={true}
                    key="template-not-selected"
                />
                )}
                <LabeledInput
                className={styles.selector}
                label={`Select Metadata ${SCHEMA_SYNONYM}`}
                >
                <TemplateSearch
                    allowCreate={true}
                    disabled={isTemplateLoading || isReadOnly}
                    error={hasAttemptedSubmit && !appliedTemplate}
                    value={appliedTemplate?.templateId}
                    onSelect={(t) => dispatch(applyTemplate(t))}
                />
                </LabeledInput>
            </>
            )}
            {isSelectedJobLoading ? (
            <div className={styles.spinContainer}>
                <div>Loading...</div>
                <Spin />
            </div>
            ) : (
            <>
                {hasAttemptedSubmit && !!validationErrors.length && (
                <Alert
                    className={styles.alert}
                    message={validationErrors.map((e) => (
                    <div key={e}>{e}</div>
                    ))}
                    showIcon={true}
                    type="error"
                    key="validation-errors"
                />
                )}
                <CustomDataTable hasSubmitBeenAttempted={hasAttemptedSubmit} />
                {uploadError && (
                <Alert
                    className={styles.alert}
                    message="Upload Failed"
                    description={uploadError}
                    type="error"
                    showIcon={true}
                    key="upload-failed"
                />
                )}
            </>
            )}
        <AddMetadataPageFooter onSubmit={() => setHasAttemptedSubmit(true)} />
        </div>
        </>
    )
}
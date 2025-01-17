import { Alert, Spin, Radio } from "antd";
import { ipcRenderer, OpenDialogOptions } from "electron";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { MainProcessEvents, SCHEMA_SYNONYM } from "../../../shared/constants";
import DragAndDrop from "../../components/DragAndDrop";
import LabeledInput from "../../components/LabeledInput";
import TemplateSearch from "../../components/TemplateSearch";
import { AnnotationName } from "../../constants";
import {
  getIsLoading,
  getRequestsInProgress,
  getUploadError,
} from "../../state/feedback/selectors";
import { getImagingSessions } from "../../state/metadata/selectors";
import { loadFiles } from "../../state/selection/actions";
import {
  getAreSelectedUploadsInFlight,
  getSelectedUploads,
  getUploadType,
} from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { AsyncRequest } from "../../state/types";
import { applyTemplate, updateUpload } from "../../state/upload/actions";
import {
  getUploadAsTableRows,
  getUploadValidationErrors,
} from "../../state/upload/selectors";
import CustomDataTable from "../CustomDataTable";

import PageFooter from "./PageFooter";
import UploadTypeSelector from "./UploadTypeSelector";
import DragAndDropPrompt from "./DragAndDropPrompt";

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
  const appliedTemplate = useSelector(getAppliedTemplate);
  const imagingSessions = useSelector(getImagingSessions);
  const isPageLoading = useSelector(getIsLoading);
  const isReadOnly = useSelector(getAreSelectedUploadsInFlight);
  const requestsInProgress = useSelector(getRequestsInProgress);
  const selectedUploads = useSelector(getSelectedUploads);
  const uploadError = useSelector(getUploadError);
  const uploads = useSelector(getUploadAsTableRows);
  const validationErrors = useSelector(getUploadValidationErrors);

  const uploadType = useSelector(getUploadType);

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
    // <DragAndDrop
    //   className={styles.dragAndDropBox}
    //   disabled={!!selectedUploads.length}
    //   overlayChildren={!Object.keys(uploads).length && !isPageLoading}
    //   onDrop={(f) => dispatch(loadFiles(f))}
    //   openDialogOptions={openDialogOptions}
    // >
    //   <div className={styles.contentContainer}>
    //     {!isSelectedJobLoading && (
    //       <>
    //         {hasAttemptedSubmit && !appliedTemplate && (
    //           <Alert
    //             className={styles.alert}
    //             message="Please select a template."
    //             type="error"
    //             showIcon={true}
    //             key="template-not-selected"
    //           />
    //         )}
    //         <LabeledInput
    //           className={styles.selector}
    //           label={`Select Metadata ${SCHEMA_SYNONYM}`}
    //         >
    //           <TemplateSearch
    //             allowCreate={true}
    //             disabled={isTemplateLoading || isReadOnly}
    //             error={hasAttemptedSubmit && !appliedTemplate}
    //             value={appliedTemplate?.templateId}
    //             onSelect={(t) => dispatch(applyTemplate(t))}
    //           />
    //         </LabeledInput>
    //       </>
    //     )}
    //     {isSelectedJobLoading ? (
    //       <div className={styles.spinContainer}>
    //         <div>Loading...</div>
    //         <Spin />
    //       </div>
    //     ) : (
    //       <>
    //         {hasAttemptedSubmit && !!validationErrors.length && (
    //           <Alert
    //             className={styles.alert}
    //             message={validationErrors.map((e) => (
    //               <div key={e}>{e}</div>
    //             ))}
    //             showIcon={true}
    //             type="error"
    //             key="validation-errors"
    //           />
    //         )}
    //         <CustomDataTable hasSubmitBeenAttempted={hasAttemptedSubmit} />
    //         {uploadError && (
    //           <Alert
    //             className={styles.alert}
    //             message="Upload Failed"
    //             description={uploadError}
    //             type="error"
    //             showIcon={true}
    //             key="upload-failed"
    //           />
    //         )}
    //       </>
    //     )}
    //   </div>
    //   <PageFooter onSubmit={() => setHasAttemptedSubmit(true)} />
    // </DragAndDrop>

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
    </div>
  );
}

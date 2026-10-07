import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import { Progress, Tooltip } from "antd";
import * as React from "react";
import { CellProps } from "react-table";

import {
  TOOLTIP_ENTER_DELAY,
  TOOLTIP_LEAVE_DELAY,
} from "../../../../constants";
import { JSSJobStatus } from "../../../../services/job-status-service/types";
import { UploadSummaryTableRow } from "../../../../state/types";

const styles = require("./styles.pcss");

// `currentStage` values set by the storage service on its upload job
const STAGE_INFO: { [stage: string]: string } = {
  INITIALIZED: "Waiting to start",
  CALCULATE_FILE_SIZE: "Calculating file size",
  COPY_TO_FMS_CACHE: "Copying to FMS cache",
  CHECKSUM: "Calculating MD5 checksum",
  UPLOAD_TO_S3: "Uploading file",
  S3_DOWNLOAD: "Downloading from cloud storage",
  LABKEY_SYNC: "Registering file in FMS",
  // The storage service is done, the app is writing the file's metadata
  SUCCEEDED: "Saving file metadata",
};

export default function StatusCell(props: CellProps<UploadSummaryTableRow>) {
  let tooltip = props.value;
  const error =
    props.row.original.serviceFields?.uploadRequest?.error ||
    props.row.original.error;
  if (error) {
    tooltip = `${props.value}: ${error}`;
  }

  let content: React.ReactNode;
  if (JSSJobStatus.SUCCEEDED === props.value) {
    const etlProcess =
      props.row.original.serviceFields?.postUploadProcessing?.etl;

    const isConditionalSuccess = etlProcess?.status !== JSSJobStatus.SUCCEEDED;
    tooltip = isConditionalSuccess
      ? `${tooltip} - File successfully uploaded to FMS. It will be searchable once all metadata has been appended, which is happening now in the background.`
      : tooltip;

    content = (
      <CheckCircleFilled
        className={`${styles.success} ${
          isConditionalSuccess ? styles["success-conditional"] : ""
        }`}
      />
    );
  } else if (JSSJobStatus.FAILED === props.value) {
    content = <CloseCircleFilled className={styles.failed} />;
  } else if (JSSJobStatus.UNRECOVERABLE === props.value) {
    content = <CloseCircleFilled className={styles.unrecoverable} />;
  } else {
    const { currentStage = "", progress = 0 } = props.row.original;
    const stageInfo = STAGE_INFO[currentStage] || currentStage;
    tooltip = `${tooltip} - ${stageInfo}`;
    content = (
      <>
        <Progress type="circle" percent={progress} width={25} status="active" />
        <div className={styles.activeInfo}>
          <p>{stageInfo}</p>
        </div>
      </>
    );
  }

  return (
    <Tooltip
      title={tooltip}
      mouseEnterDelay={TOOLTIP_ENTER_DELAY}
      mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
    >
      <div className={styles.container}>{content}</div>
    </Tooltip>
  );
}

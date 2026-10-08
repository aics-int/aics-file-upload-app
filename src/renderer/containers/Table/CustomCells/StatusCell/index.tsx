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

// `currentStage` values set by FSS on its upload job
const STAGE_INFO: { [stage: string]: string } = {
  INITIALIZED: "Waiting to start",
  CALCULATE_FILE_SIZE: "Calculating file size",
  COPY_TO_FMS_CACHE: "Copying to FMS cache",
  CHECKSUM: "Calculating MD5 checksum",
  UPLOAD_TO_S3: "Uploading file",
  S3_DOWNLOAD: "Downloading from cloud storage",
  LABKEY_SYNC: "Registering file in FMS",
};

export default function StatusCell(props: CellProps<UploadSummaryTableRow>) {
  let tooltip = props.value;
  if (props.row.original.serviceFields?.error) {
    tooltip = `${props.value}: ${props.row.original.serviceFields.error}`;
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
    // TODO SWE-875 update progress for pre and post upload
    // based on props.row.original.progress.status=[PRE | UPLOAD | POST]
  } else {
    const { progress = 0, currentStage = "" } =
      props.row.original.progress || {};
    const stageInfo = STAGE_INFO[currentStage] || currentStage;

    // The stages FSS runs for an upload, in order. Only files kept in local storage are copied to the FMS cache.
    const steps = [
      "CALCULATE_FILE_SIZE",
      ...(props.row.original.serviceFields?.files?.[0]?.file.shouldBeInLocal
        ? ["COPY_TO_FMS_CACHE"]
        : []),
      "CHECKSUM",
      "UPLOAD_TO_S3",
      "LABKEY_SYNC",
    ];
    const stepIndex = steps.indexOf(currentStage);
    const stepInfo =
      stepIndex === -1 ? "" : `Step ${stepIndex + 1} of ${steps.length}`;

    if (stageInfo) {
      tooltip = `${tooltip} - ${
        stepInfo ? `${stepInfo}: ${stageInfo}` : stageInfo
      }`;
    }
    content = (
      <>
        <Progress type="circle" percent={progress} width={25} status="active" />
        <div className={styles.activeInfo}>
          {stepInfo && <p>{stepInfo}</p>}
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

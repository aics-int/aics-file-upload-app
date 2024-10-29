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
import { getPowerOf1000 } from "../../../../util";

import { Step } from "./Step";

const styles = require("./styles.pcss");

const POWER_OF_1000_TO_ABBREV = new Map<number, string>([
  [0, "B"],
  [1, "KB"],
  [2, "MB"],
  [3, "GB"],
  [4, "TB"],
]);

const STEP_INFO = {
  [Step.ONE]: "Step 1 of 3: Pre-upload tasks",
  [Step.TWO]: "Step 2 of 3: Uploading file",
  [Step.THREE]: "Step 3 of 3: Post-upload tasks",
};

function getBytesDisplay(bytes: number): string {
  const powerOf1000 = getPowerOf1000(bytes);
  const unit = POWER_OF_1000_TO_ABBREV.get(powerOf1000);
  const number: number = bytes / Math.pow(1000, powerOf1000);
  let roundedNumber: string = number.toFixed(1);
  if (roundedNumber.endsWith("0")) {
    roundedNumber = number.toFixed(0);
  }
  return `${roundedNumber}${unit}`;
}

export default function StatusCell(props: CellProps<UploadSummaryTableRow>) {
  let tooltip = props.value;
  if (props.row.original.serviceFields?.error) {
    tooltip = `${props.value}: ${props.row.original.serviceFields.error}`;
  }

  let content: React.ReactNode;
  if (JSSJobStatus.SUCCEEDED === props.value) {
    
    // Though an upload has a successful status there may be post upload
    // processes that have yet to complete which would make this upload
    // effectively incomplete
    const etlProcess = 
      props.row.original.serviceFields?.postUploadProcessing?.etl;

    if (etlProcess?.status === JSSJobStatus.FAILED) {
      tooltip = `${tooltip} - File has been successfully uploaded to FMS, but may not be viewable in the File Upload App. Attempt to make it visible in the FMS Explorer resulted in the following error: ${etlProcess?.status_detail}`;
    } else if (etlProcess?.status !== JSSJobStatus.SUCCEEDED) {
      tooltip = `${tooltip} - File has been successfully uploaded; working on making it visible in the File Upload App if it isn't already`;
    }

    const iconColor =
      etlProcess?.status === JSSJobStatus.FAILED ||
      etlProcess?.status !== JSSJobStatus.SUCCEEDED
        ? "#CEE9DF"
        : undefined;

    content = <CheckCircleFilled style={{ color: iconColor }} className={styles.success} />;
  } else if (JSSJobStatus.FAILED === props.value) {
    content = <CloseCircleFilled className={styles.failed} />;
  } else if (JSSJobStatus.UNRECOVERABLE === props.value) {
    content = <CloseCircleFilled className={styles.unrecoverable} />;
    // TODO SWE-875 update progress for pre and post upload
    // based on props.row.original.progress.status=[PRE | UPLOAD | POST]
  } else {
    const {
      bytesUploaded = 0,
      totalBytes = 0,
      step = 0,
    } = props.row.original.progress || {};

    const displayForStep = getBytesDisplay(bytesUploaded);
    const totalForStep = getBytesDisplay(totalBytes);
    let progressForStep = 0;
    if (bytesUploaded && totalBytes) {
      progressForStep = Math.floor((bytesUploaded / totalBytes) * 100);
    }

    tooltip = `${tooltip} - ${STEP_INFO[step]}`;
    content = (
      <>
        <Progress
          type="circle"
          percent={progressForStep}
          width={25}
          status="active"
        />
        <div className={styles.activeInfo}>
          <p>Step {step + 1} of 3</p>
          <p>
            {displayForStep} / {totalForStep}
          </p>
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


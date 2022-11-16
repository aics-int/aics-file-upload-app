import { CheckCircleFilled, CloseCircleFilled, QuestionCircleFilled } from "@ant-design/icons";
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

const styles = require("./styles.pcss");

const POWER_OF_1000_TO_ABBREV = new Map<number, string>([
  [0, "B"],
  [1, "KB"],
  [2, "MB"],
  [3, "GB"],
  [4, "TB"],
]);

enum Step {
  ONE,
  TWO,
}

const STEP_INFO = {
  [Step.ONE]: "Step 1 of 2: Uploading file",
  [Step.TWO]: "Step 2 of 2: Adding metadata",
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
    if (etlProcess?.status === JSSJobStatus.SUCCEEDED) {
      content = (
        <CheckCircleFilled className={styles.success} />
      );
    } else {
      // Switch the incomplete status tooltip depending on if the post upload
      // has yet to run vs if it has failed
      if (etlProcess?.status === JSSJobStatus.FAILED) {
        tooltip = `${tooltip} - File has been successfully uploaded to FMS, but may not be viewable in the FMS File Explorer. Attempt to make it visible in the FMS Explorer resulted in the following error: ${etlProcess.status_detail}`;
      } else {
        tooltip = `${tooltip} - File has been successfully uploaded; working on making it visible in the FMS File Explorer if it isn't already`;
      }

      content = (
        <QuestionCircleFilled
          className={styles.success}
        />
      );
    }
  } else if (JSSJobStatus.FAILED === props.value) {
    content = (
      <CloseCircleFilled className={styles.failed} />
    );
  } else if (JSSJobStatus.UNRECOVERABLE === props.value) {
    content = (
      <CloseCircleFilled
        className={styles.unrecoverable}
      />
    );
  } else {
    const {
      bytesUploaded = 0,
      totalBytes = 0,
    } = props.row.original.progress || {};

    let step = Step.ONE;
    let displayForStep = getBytesDisplay(bytesUploaded);
    let totalForStep = getBytesDisplay(totalBytes);
    let progressForStep = 0;
    if (totalBytes > 0 && bytesUploaded >= totalBytes) {
      // All bytes have been uploaded -> the upload is on the last step
      step = Step.TWO;
      displayForStep = "0";
      totalForStep = "1";
    } 
    else if (bytesUploaded && totalBytes) {
      // Uploading bytes, and progress has been made.
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
          <p>Step {step + 1} of 2</p>
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

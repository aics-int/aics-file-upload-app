import { Icon, Progress, Tooltip } from "antd";
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
  THREE,
}

const STEP_INFO = {
  [Step.ONE]: "Step 1 of 3: Reading file",
  [Step.TWO]: "Step 2 of 3: Uploading file",
  [Step.THREE]: "Step 3 of 3: Adding metadata",
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
    const etlProcess =
      props.row.original.serviceFields?.postUploadProcessing?.etl;
    if (etlProcess?.status === JSSJobStatus.SUCCEEDED) {
      content = (
        <Icon className={styles.success} type="check-circle" theme="filled" />
      );
    } else {
      if (etlProcess?.status === JSSJobStatus.FAILED) {
        tooltip = `${tooltip} - File has been successfully uploaded to FMS, but may not be viewable in the FMS File Explorer. Attempt to make it visible in the FMS Explorer resulted in the following error: ${etlProcess.status_detail}`;
      } else {
        tooltip = `${tooltip} - File has been successfully uploaded; working on making it visible in the FMS File Explorer if it isn't already`;
      }
      content = (
        <Icon
          className={styles.success}
          type="question-circle"
          theme="filled"
        />
      );
    }
  } else if (JSSJobStatus.FAILED === props.value) {
    content = (
      <Icon className={styles.failed} type="close-circle" theme="filled" />
    );
  } else if (JSSJobStatus.UNRECOVERABLE === props.value) {
    content = (
      <Icon
        className={styles.unrecoverable}
        type="close-circle"
        theme="filled"
      />
    );
  } else {
    const md5BytesRead = props.row.original.progress?.completedBytes || 0;
    const bytesCompleted =
      (props.row.original.serviceFields?.calculatedMD5 &&
        props.row.original.progress?.completedBytes) ||
      0;
    const totalBytes = props.row.original.progress?.totalBytes || 0;

    let step = Step.ONE;
    if (bytesCompleted === totalBytes) {
      step = Step.THREE;
    } else if (bytesCompleted) {
      step = Step.TWO;
    }
    tooltip = `${tooltip} - ${STEP_INFO[step]}`;

    const bytesReadForStep = bytesCompleted || md5BytesRead;
    const progressForStep =
      totalBytes === bytesReadForStep
        ? 100
        : Math.floor(totalBytes / bytesReadForStep);

    content = (
      <>
        <Progress
          type="circle"
          percent={progressForStep}
          width={25}
          status="active"
        />
        <div className={styles.activeInfo}>
          <p>Step {step} of 3</p>
          <p>
            {getBytesDisplay(bytesCompleted || md5BytesRead)} /{" "}
            {getBytesDisplay(totalBytes)}
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

import {
  CheckCircleFilled,
  ExclamationCircleFilled,
  InfoCircleFilled,
  SaveFilled,
  WarningFilled,
} from "@ant-design/icons";
import classNames from "classnames";
import * as React from "react";

import { AlertType } from "../../state/types";

const styles = require("./styles.pcss");

interface Props {
  type: AlertType;
}

export default function AlertIcon({ type }: Props) {
  switch (type) {
    case AlertType.WARN:
      return <WarningFilled className={classNames(styles.icon, styles.warn)} />;
    case AlertType.SUCCESS:
      return (
        <CheckCircleFilled
          className={classNames(styles.icon, styles.success)}
        />
      );
    case AlertType.ERROR:
      return (
        <ExclamationCircleFilled
          className={classNames(styles.icon, styles.error)}
        />
      );
    case AlertType.INFO:
      return (
        <InfoCircleFilled className={classNames(styles.icon, styles.info)} />
      );
    case AlertType.DRAFT_SAVED:
      return <SaveFilled className={classNames(styles.icon, styles.save)} />;
  }
}

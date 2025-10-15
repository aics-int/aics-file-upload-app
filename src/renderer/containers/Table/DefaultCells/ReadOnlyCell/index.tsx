import { Tooltip } from "antd";
import { castArray } from "lodash";
import * as React from "react";
import { CellProps } from "react-table";

import {
  TOOLTIP_ENTER_DELAY,
  TOOLTIP_LEAVE_DELAY,
} from "../../../../constants";
import { useDisplayValue } from "../DisplayCell";

const styles = require("./styles.pcss");

/*
  This component renders a read only text display showcasing the data
  for this particular cell. Features like cell-dragging are N/A.
*/
export default function ReadOnlyCell<T extends Record<string, any>>(
  props: CellProps<T>
) {
  const displayValue = useDisplayValue(
    castArray(props.value),
    props.column.type
  );
  return (
    <Tooltip
      arrowPointAtCenter
      autoAdjustOverflow
      mouseEnterDelay={TOOLTIP_ENTER_DELAY}
      mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
      title={displayValue}
    >
      <input readOnly className={styles.readOnlyCell} value={displayValue} />
    </Tooltip>
  );
}

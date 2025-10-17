import { CaretDownOutlined, CaretUpOutlined } from "@ant-design/icons";
import { Tooltip } from "antd";
import * as React from "react";
import { HeaderProps } from "react-table";

import {
  TOOLTIP_ENTER_DELAY,
  TOOLTIP_LEAVE_DELAY,
} from "../../../../constants";

const styles = require("./styles.pcss");

/*
  This component renders an interactive header rendered by default for
  all react-tables.
*/
export default function DefaultHeader<T extends Record<string, any>>({
  column,
  name,
}: HeaderProps<T>) {
  return (
    <Tooltip
      title={column.description}
      mouseEnterDelay={TOOLTIP_ENTER_DELAY}
      mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
    >
      <div className={styles.header}>
        {name || column.id} {column.isRequired && "* "}
        {column.isSorted &&
          (column.isSortedDesc ? <CaretDownOutlined /> : <CaretUpOutlined />)}
      </div>
    </Tooltip>
  );
}

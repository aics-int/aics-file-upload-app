import { basename } from "path";

import { Tooltip } from "antd";
import classNames from "classnames";
import React from "react";
import { CellProps } from "react-table";

import {
  TOOLTIP_ENTER_DELAY,
  TOOLTIP_LEAVE_DELAY,
} from "../../../../constants";
import { FileModel } from "../../../../state/types";

const styles = require("./styles.pcss");

/**
 * This is used in the react-tables when a user for displaying the file path
 * or sub row title. It displays the file name along with clickable icons
 * for interacting with and editing sub rows.
 */
export default function FilenameCell({
  row,
  value: file,
}: CellProps<FileModel, string>) {
  const [isHighlighted, setIsHighlighted] = React.useState(false);

  return (
    <div
      className={classNames(styles.fileCell, {
        [styles.highlight]: isHighlighted,
      })}
      style={{ paddingLeft: `${row.depth * 15}px` }}
    >
      <Tooltip
        title={file}
        mouseEnterDelay={TOOLTIP_ENTER_DELAY}
        mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
      >
        <input
          readOnly
          tabIndex={-1}
          className={styles.fileCellInput}
          onBlur={() => setIsHighlighted(false)}
          onFocus={() => setIsHighlighted(true)}
          onClick={() => setIsHighlighted(true)}
          value={basename(file)}
        />
      </Tooltip>
    </div>
  );
}

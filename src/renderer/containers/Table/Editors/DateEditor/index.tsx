import { DeleteOutlined } from "@ant-design/icons";
import { Button, DatePicker } from "antd";
import moment from "moment";
import React, { useState } from "react";
import { ColumnInstance } from "react-table";

import { DATE_FORMAT, DATETIME_FORMAT } from "../../../../constants";
import { ColumnType } from "../../../../services/labkey-client/types";
import { UploadTableRow } from "../../../../state/upload/types";

const styles = require("./styles.pcss");

const CLEAR_BUTTON = "clear-button";

interface Props {
  initialValue: Date[];
  column: ColumnInstance<UploadTableRow>;
  commitChanges: (value: Date[]) => void;
}

export default function DateEditor({
  initialValue,
  column,
  commitChanges,
}: Props) {
  const [value, setValue] = useState<Date | undefined>(
    initialValue.length > 0 ? initialValue[0] : undefined
  );

  function handleCommit() {
    commitChanges(value ? [value] : []);
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    // Only commit if navigating to the next cell and not clicking an
    // element in the Date window
    if (
      !(e.relatedTarget instanceof Element) ||
      (e.relatedTarget.className !== "ant-calendar-date-panel" &&
        e.relatedTarget.id !== CLEAR_BUTTON &&
        (e.relatedTarget.tagName !== "LI" ||
          e.relatedTarget.attributes.getNamedItem("role")?.value !== "button"))
    ) {
      handleCommit();
    }
  }

  return (
    <div onBlur={handleBlur}>
      <DatePicker
        open
        autoFocus
        onOk={handleCommit}
        className={styles.datePicker}
        showTime={column.type === ColumnType.DATETIME}
        placeholder="Add a Date"
        value={value ? moment(value) : undefined}
        onChange={(d) => setValue(d?.toDate() ?? undefined)}
        renderExtraFooter={() => (
          <div className={styles.footer}>
            <Button
              className={styles.clearButton}
              icon={<DeleteOutlined />}
              onClick={() => setValue(undefined)}
              id={CLEAR_BUTTON}
            >
              Clear
            </Button>
          </div>
        )}
        format={
          column.type === ColumnType.DATETIME ? DATETIME_FORMAT : DATE_FORMAT
        }
      />
    </div>
  );
}

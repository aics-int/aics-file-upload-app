import { Checkbox } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import * as React from "react";
import { useDispatch } from "react-redux";
import { HeaderProps } from "react-table";

import { setLastSelectedUpload } from "../../../../state/job/actions";

const styles = require("./styles.pcss");

/*
  This renders a checkbox that controls the selection state
  of every row
*/
export default function SelectionHeader<T extends Record<string, any>>(
  props: HeaderProps<T>
) {
  const dispatch = useDispatch();
  const checkBoxProps = props.getToggleAllRowsSelectedProps();

  function onChange(e: CheckboxChangeEvent) {
    // Remove the last selected upload from tracking
    dispatch(setLastSelectedUpload(undefined));

    props.toggleAllRowsSelected(e.target.checked);
    props.onSelect?.(props.rows, !e.target.checked);
  }

  return (
    <div className={styles.checkboxContainer}>
      <Checkbox {...checkBoxProps} onChange={onChange} />
    </div>
  );
}

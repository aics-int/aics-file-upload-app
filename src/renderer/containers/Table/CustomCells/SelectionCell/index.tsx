import { Checkbox } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps, Row } from "react-table";

import { setLastSelectedUpload } from "../../../../state/job/actions";
import { getLastSelectedUpload } from "../../../../state/job/selectors";

const styles = require("./styles.pcss");

interface Props<T extends Record<string, any>> extends CellProps<T> {
  onSelect?: (rows: Row<T>[], isDeselecting: boolean) => void;
}

/*
    This renders a checkbox that controls the selection state
    of an individual row.
*/
export default function SelectionCell<T extends Record<string, any>>(props: Props<T>) {
  const dispatch = useDispatch();
  const lastRowSelected = useSelector(getLastSelectedUpload);
  const checkBoxProps = props.row.getToggleRowSelectedProps();

  function onChange(e: CheckboxChangeEvent) {
    // react-table only tracks the index of the row before filtering/sorting
    // but to best determine if a sort or filter has changed where the last row
    // selected is we need the index post filtering/sorting
    const index = props.rows.findIndex((r) => r.id === props.row.id);
    // Track the last selected upload row to enable shift selection
    dispatch(setLastSelectedUpload({ index, id: props.row.id }));

    // If the user holds SHIFT while selecting rows the inbetween rows will be selected
    // unless the last row selected has shifted in position since the interaction
    if (
      e.nativeEvent.shiftKey &&
      lastRowSelected &&
      lastRowSelected.id === props.rows[lastRowSelected.index]?.id
    ) {
      const lowerIndex =
        lastRowSelected.index < index ? lastRowSelected.index : index;
      const higherIndex =
        lastRowSelected.index < index ? index : lastRowSelected.index;
      const rows = props.rows.slice(lowerIndex, higherIndex + 1);
      rows.forEach((row) => {
        props.toggleRowSelected(row.id, e.target.checked);
      });
      props.onSelect?.(rows, !e.target.checked);
    } else {
      checkBoxProps.onChange?.(e as any);
      props.onSelect?.([props.row], !e.target.checked);
    }
  }

  return (
    <div className={styles.checkboxContainer}>
      <Checkbox {...checkBoxProps} onChange={onChange} />
    </div>
  );
}

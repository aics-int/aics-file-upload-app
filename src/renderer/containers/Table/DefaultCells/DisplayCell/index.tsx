import { CloseCircleFilled } from "@ant-design/icons";
import { Tooltip } from "antd";
import classNames from "classnames";
import moment from "moment";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps } from "react-table";

import {
  TOOLTIP_ENTER_DELAY,
  TOOLTIP_LEAVE_DELAY,
} from "../../../../constants";
import { ColumnType } from "../../../../services/labkey-client/types";
import {
  addRowToDragEvent,
  removeRowsFromDragEvent,
  startCellDrag,
  stopCellDrag,
} from "../../../../state/selection/actions";
import {
  getCellAtDragStart,
  getRowsSelectedForDragEvent,
} from "../../../../state/selection/selectors";
import { FileModel } from "../../../../state/types";
import { updateUpload } from "../../../../state/upload/actions";
import { getFileToAnnotationHasValueMap } from "../../../../state/upload/selectors";
import { Duration } from "../../../../types";
import { ColumnValue } from "../../types";

const styles = require("./styles.pcss");

interface Props extends CellProps<FileModel> {
  disabled?: boolean;
  onStartEditing: () => void;
  onTabExit?: () => void;
}

export const useDisplayValue = (value?: ColumnValue, type?: ColumnType) =>
  React.useMemo(() => {
    if (!value || !value.length) {
      return "";
    }
    switch (type) {
      case ColumnType.BOOLEAN:
        return value[0] ? "Yes" : "No";
      case ColumnType.DATE:
        return (value as Date[])
          .map((d) => moment(d).format("M/D/YYYY"))
          .join(", ");
      case ColumnType.DATETIME:
        return (value as Date[])
          .map((d) => moment(d).format("M/D/YYYY H:m:s"))
          .join(", ");
      case ColumnType.DURATION: {
        const { days, hours, minutes, seconds } = value[0] as Duration;
        return (
          (days ? `${days}D ` : "") +
          (hours ? `${hours}H ` : "") +
          (minutes ? `${minutes}M ` : "") +
          (seconds ? `${seconds}S ` : "")
        ).trim();
      }
      default:
        return Array.isArray(value) ? value.join(", ") : value;
    }
  }, [value, type]);

/*
  This component is responsible for rendering a non-editable display
  of the data. Notably this component also allows cells be dragged
  across a column to essentially copy its value across the cells dragged
  over.
*/
export default function DisplayCell(props: Props) {
  const dispatch = useDispatch();
  const cellAtDragStart = useSelector(getCellAtDragStart);
  const rowsFromDragEvent = useSelector(getRowsSelectedForDragEvent);
  const fileToAnnotationHasValueMap = useSelector(
    getFileToAnnotationHasValueMap
  );

  const isAutofilled =
    props.row.original.autofilledFields?.includes(props.column.id) ?? false;
  const [isActive, setIsActive] = React.useState(false);
  const inputEl = React.useRef<HTMLInputElement>(null);
  const displayValue = useDisplayValue(props.value, props.column.type);
  const {
    column: { id: columnId },
    row: { id: rowId, index: rowIndex },
    value,
  } = props;

  let isHighlighted = isActive;
  if (!isHighlighted && cellAtDragStart?.columnId === columnId) {
    isHighlighted = !![
      { index: cellAtDragStart.rowIndex },
      ...(rowsFromDragEvent || []),
    ].find((row) => row.index === rowIndex);
  }

  // We want to display a validation error in this cell if there is no value
  // for a row
  const shouldShowError =
    props.column.hasSubmitBeenAttempted &&
    props.column.isRequired &&
    !fileToAnnotationHasValueMap[props.row.original.file]?.[props.column.id];

  // Track if any rows have been skipped by the drag
  // possible if the user exited our elements with onDragEnter
  // events and then returned to a latter one
  React.useEffect(() => {
    if (
      rowsFromDragEvent?.length &&
      cellAtDragStart?.columnId === columnId &&
      !rowsFromDragEvent.find((row) => row.index === rowIndex)
    ) {
      let min = cellAtDragStart.rowIndex;
      let max = cellAtDragStart.rowIndex;
      rowsFromDragEvent.forEach((row) => {
        min = Math.min(min, row.index);
        max = Math.max(max, row.index);
      });
      if (min < rowIndex && max > rowIndex) {
        dispatch(addRowToDragEvent(rowId, rowIndex));
      }
    }
  }, [dispatch, rowId, rowIndex, columnId, cellAtDragStart, rowsFromDragEvent]);

  function onDragStart() {
    dispatch(startCellDrag(rowId, rowIndex, columnId));
  }

  function onDragEnter() {
    if (cellAtDragStart) {
      if (rowsFromDragEvent) {
        // Check if previously dragged over cells are now irrelevant
        // due to the user now dragging a different direction
        let rowsToRemove;
        if (cellAtDragStart.rowIndex === rowIndex) {
          rowsToRemove = rowsFromDragEvent;
        } else if (cellAtDragStart.rowIndex > rowIndex) {
          rowsToRemove = rowsFromDragEvent.filter(
            ({ index }) => index < rowIndex || index > cellAtDragStart.rowIndex
          );
        } else {
          rowsToRemove = rowsFromDragEvent.filter(
            ({ index }) => index > rowIndex || index < cellAtDragStart.rowIndex
          );
        }
        if (rowsToRemove.length) {
          dispatch(removeRowsFromDragEvent(rowsToRemove.map((row) => row.id)));
        }
      }
      if (
        !rowsFromDragEvent ||
        !rowsFromDragEvent.find((row) => row.index === rowIndex)
      ) {
        // On drag entry if this cell hasn't been dragged over
        // we know we need to add it to our list of rows dragged over
        dispatch(addRowToDragEvent(rowId, rowIndex));
      }
    }
  }

  function onCopy() {
    const copyData = JSON.stringify({
      value,
      columnId: props.column.id,
    });
    navigator.clipboard.writeText(copyData);
  }

  async function onPaste() {
    const clipboardText = await navigator.clipboard.readText();
    try {
      const copiedData = JSON.parse(clipboardText);
      if (copiedData.columnId === props.column.id) {
        dispatch(
          updateUpload(props.row.id, { [props.column.id]: copiedData.value })
        );
      }
    } catch (err) {
      console.error(err);
    }
  }

  function onDisplayInputKeyDown(e: React.KeyboardEvent) {
    if (isAutofilled) return;
    if (e.key !== "Tab" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      props.onStartEditing();
    }
  }

  const onHiddenInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Tab") {
      props.onTabExit && props.onTabExit();
    }
  };

  return (
    <Tooltip
      arrowPointAtCenter
      autoAdjustOverflow
      mouseEnterDelay={TOOLTIP_ENTER_DELAY}
      mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
      title={cellAtDragStart ? "" : displayValue}
    >
      <div className={styles.tooltipAnchor} onDragEnter={onDragEnter}>
        {/* This input is solely for keyboard navigation */}
        <input
          className={styles.hidden}
          onFocus={props.onStartEditing}
          onKeyDown={props.onTabExit ? onHiddenInputKeyDown : undefined}
        />
        <div
          className={styles.readOnlyCellContainer}
          onCopy={onCopy}
          onPaste={onPaste}
        >
          <input
            readOnly
            disabled={props.disabled || isAutofilled}
            ref={inputEl}
            tabIndex={-1}
            className={classNames(styles.readOnlyCell, {
              [styles.highlight]: isHighlighted,
              [styles.autofilled]: isAutofilled,
            })}
            onKeyDown={onDisplayInputKeyDown}
            onBlur={() => setIsActive(false)}
            onClick={() => {
              if (isAutofilled) return;
              isHighlighted ? props.onStartEditing() : setIsActive(true);
            }}
            onDoubleClick={() => {
              if (isAutofilled) return;
              props.onStartEditing();
            }}
            value={displayValue}
          />
          {shouldShowError && (
            <Tooltip
              title={`${props.column.id} is required`}
              mouseEnterDelay={TOOLTIP_ENTER_DELAY}
              mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
            >
              <CloseCircleFilled className={styles.errorIcon} />
            </Tooltip>
          )}
          <div
            draggable
            className={classNames(styles.dragBox, {
              [styles.invisible]: !isHighlighted,
            })}
            onDragStart={onDragStart}
            onDragEnd={() => dispatch(stopCellDrag())}
          />
        </div>
      </div>
    </Tooltip>
  );
}

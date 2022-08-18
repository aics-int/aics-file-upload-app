import classNames from "classnames";
import { isEqual } from "lodash";
import * as React from "react";
import {
  Draggable,
  DraggableStateSnapshot,
  DraggableProvided,
} from "react-beautiful-dnd";
import { Row } from "react-table";
import { ListChildComponentProps } from "react-window";

const styles = require("./styles.pcss");

export const DRAG_HANDLER_COLUMN = "--";

interface Props<T extends {}> extends Row<T> {
  draggableState: DraggableStateSnapshot;
  draggableProps: DraggableProvided;
  onContextMenu?: (row: Row<T>, onCloseCallback: () => void) => void;
  rowStyle?: React.CSSProperties;
}

/**
 * Row in a react-table. This component is memoized below to only re-render when
 * the rows data is changed, has been expanded, or has new columns. Abstracting this
 * out into a memoized component allows the app to keep up with rapid updates from
 * sources like the copy progress updater.
 */
function TableRow<T extends {}>(props: Props<T>) {
  const [isHighlighted, setIsHighlighted] = React.useState(false);

  function onContextMenu() {
    if (props.onContextMenu) {
      setIsHighlighted(true);
      props.onContextMenu(props, () => setIsHighlighted(false));
    }
  }

  return (
    <div
      {...props.draggableProps.draggableProps}
      {...props.getRowProps({
        style: {
          ...(props.rowStyle || {}),
          ...props.draggableProps.draggableProps.style,
        },
      })}
      className={classNames(styles.rowStyleDefault, {
        [styles.highlighted]:
          isHighlighted ||
          props.draggableState.isDragging ||
          !!props.draggableState.combineTargetFor,
      })}
      onContextMenu={onContextMenu}
      // Can't seem to make this happy, this appears
      // to be the same as how it is intended to be used
      // https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/guides/using-inner-ref.md
      // - Sean M 07/27/21
      // eslint-disable-next-line @typescript-eslint/unbound-method
      ref={props.draggableProps.innerRef}
    >
      {props.cells.map((cell) => (
        <div
          {...cell.getCellProps()}
          className={styles.tableCell}
          key={cell.getCellProps().key}
          {...(cell.column.id === DRAG_HANDLER_COLUMN
            ? props.draggableProps.dragHandleProps
            : {})}
        >
          {cell.render("Cell")}
        </div>
      ))}
    </div>
  );
}

// Memoize the component
const TableRowMemoized = React.memo(
  TableRow,
  (prevProp, nextProp) =>
    isEqual(prevProp.original, nextProp.original) &&
    prevProp.isSelected === nextProp.isSelected &&
    // Updates row after columns change
    prevProp.cells.length === nextProp.cells.length &&
    // Updates row after resizing
    nextProp.cells.every(
      (cell, index) =>
        !cell.column.isResizing &&
        isEqual(cell.column, prevProp.cells[index].column) &&
        cell.column.id !== DRAG_HANDLER_COLUMN
    )
) as typeof TableRow;

interface ItemData<T extends {}> {
  draggableState?: DraggableStateSnapshot;
  draggableProps?: DraggableProvided;
  dropSourceId?: string;
  onContextMenu?: (row: Row<T>, onCloseCallback: () => void) => void;
  prepareRow: (row: Row<T>) => void;
  rows: Row<T>[];
}

interface TableRowRendererProps
  extends Omit<ListChildComponentProps<ItemData<any>>, "style"> {
  style?: React.CSSProperties;
}

/**
 * This renderer wrapper accepts props from react-window. This in combination with
 * the itemData prop given to react-window allows the app to determine which data to render
 * for which row. Moving this logic to be in-line or dependent on equality between the
 * rows prop forces complete unmounting/re-mounting of the rows on any update.
 */
export default function TableRowRenderer({
  index,
  style,
  data,
}: TableRowRendererProps) {
  const { rows, prepareRow } = data;
  const row = rows[index];
  prepareRow(row);

  // If this component is already supplied <Draggable> props/state
  // then this must be rendering a clone of an exising Draggable
  if (data.draggableProps && data.draggableState) {
    return (
      <TableRowMemoized
        {...row}
        rowStyle={style}
        onContextMenu={data.onContextMenu}
        draggableState={data.draggableState}
        draggableProps={data.draggableProps}
      />
    );
  }

  return (
    <Draggable
      draggableId={row.id}
      index={row.index}
      key={row.id}
      isDragDisabled={!data.dropSourceId}
    >
      {(draggableProps, draggableState) => (
        <TableRowMemoized
          {...row}
          rowStyle={style}
          onContextMenu={data.onContextMenu}
          draggableState={draggableState}
          draggableProps={draggableProps}
        />
      )}
    </Draggable>
  );
}

import classNames from "classnames";
import { noop, uniqueId } from "lodash";
import * as React from "react";
import { DragDropContext, Droppable, DropResult } from "react-beautiful-dnd";
import { Row, TableInstance } from "react-table";
import AutoSizer from "react-virtualized-auto-sizer";
import { FixedSizeList } from "react-window";

import TableRow from "./TableRow";

const styles = require("./styles.pcss");

interface Props<T extends Record<string, any>> {
  className?: string;
  tableInstance: TableInstance<T>;
  getContextMenuItems?: (row: Row<T>) => React.ReactElement;
  dragAndDropOptions?: {
    id: string;
    onRowDragEnd: (result: DropResult) => void;
  };
}

// From https://davidwalsh.name/detect-scrollbar-width
function getScrollBarWidth(): number {
  const scrollDiv = document.createElement("div");
  scrollDiv.setAttribute(
    "style",
    "width: 100px; height: 100px; overflow: scroll; position:absolute; top:-9999px;"
  );
  document.body.appendChild(scrollDiv);
  const scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
  document.body.removeChild(scrollDiv);
  return scrollbarWidth;
}

/*
  This stateless component renders a table meant for connecting to
  and utilizing a react-table instance through interactive hooks.
  The "Header" & "Cell" rendered are determined by the Header & Cell
  properties of the column definition supplied for that column or
  by the defaultColumn properties supplied to react-table.
*/
export default function Table<T extends Record<string, any>>(props: Props<T>) {
  const { className, tableInstance, getContextMenuItems } = props;

  const scrollBarSize = React.useMemo(() => getScrollBarWidth(), []);

  const { rows, prepareRow } = tableInstance;

  return (
    <div
      className={classNames(styles.tableContainer, className)}
      {...tableInstance.getTableProps()}
    >
      <div>
        {tableInstance.headerGroups.map((headerGroup) => (
          <div
            {...headerGroup.getHeaderGroupProps()}
            key={headerGroup.getHeaderGroupProps().key}
          >
            {headerGroup.headers.map((column) => (
              <div
                {...column.getHeaderProps()}
                className={styles.tableHeader}
                key={column.getHeaderProps().key}
              >
                <div className={styles.tableHeaderContainer}>
                  <div
                    {...(column.getResizerProps && column.getResizerProps())}
                    className={styles.columnResizer}
                  />
                  <div
                    {...(column.getSortByToggleProps &&
                      column.getSortByToggleProps())}
                  >
                    {column.render("Header")}
                  </div>
                  {column.canFilter && <div>{column.render("Filter")}</div>}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      <div className={styles.tableBody} {...tableInstance.getTableBodyProps()}>
        <DragDropContext
          onDragEnd={props.dragAndDropOptions?.onRowDragEnd || noop}
        >
          <Droppable
            // Droppable ID uniqueId() scenario will be effectively unused
            // since drop is disabled when id is not given to this component
            droppableId={props.dragAndDropOptions?.id || uniqueId()}
            isDropDisabled={!props.dragAndDropOptions}
            mode="virtual"
            renderClone={(draggableProps, draggableState, rubric) => (
              <TableRow
                index={rubric.source.index}
                data={{
                  rows,
                  prepareRow,
                  getContextMenuItems,
                  draggableProps,
                  draggableState,
                  dropSourceId: props.dragAndDropOptions?.id,
                }}
              />
            )}
          >
            {(droppable) => (
              <AutoSizer disableWidth defaultWidth={1} defaultHeight={1}>
                {({ height }) => (
                  <FixedSizeList
                    height={height}
                    itemData={{
                      rows,
                      prepareRow,
                      getContextMenuItems,
                      dropSourceId: props.dragAndDropOptions?.id,
                    }}
                    itemCount={tableInstance.rows.length}
                    itemSize={35}
                    // Can't seem to make this happy, this appears
                    // to be the same as how it is intended to be used
                    // https://github.com/atlassian/react-beautiful-dnd/blob/master/docs/guides/using-inner-ref.md
                    // - Sean M 07/27/21
                    // eslint-disable-next-line @typescript-eslint/unbound-method
                    outerRef={droppable.innerRef}
                    width={tableInstance.totalColumnsWidth + scrollBarSize}
                  >
                    {TableRow}
                  </FixedSizeList>
                )}
              </AutoSizer>
            )}
          </Droppable>
        </DragDropContext>
      </div>
      {!!tableInstance.filteredRows &&
        tableInstance.filteredRows.length !==
          tableInstance.preFilteredRows.length && (
          <div className={styles.tableFooter}>
            Showing {tableInstance.filteredRows.length} of{" "}
            {tableInstance.preFilteredRows.length}
          </div>
        )}
    </div>
  );
}

import { Empty } from "antd";
import * as React from "react";
import {
  CellProps,
  Column,
  FilterValue,
  HeaderProps,
  Row,
  SortByFn,
  TableInstance,
  useBlockLayout,
  useFilters,
  useResizeColumns,
  useRowSelect,
  useSortBy,
  useTable,
} from "react-table";

import { JOB_STATUSES } from "../../services/job-status-service/types";
import { UploadSummaryTableRow } from "../../state/types";
import Table from "../Table";
import SelectionCell from "../Table/CustomCells/SelectionCell";
import StatusCell from "../Table/CustomCells/StatusCell";
import ReadOnlyCell from "../Table/DefaultCells/ReadOnlyCell";
import Filter, { FilterType } from "../Table/Filter";
import DefaultHeader from "../Table/Headers/DefaultHeader";
import SelectionHeader from "../Table/Headers/SelectionHeader";

const styles = require("./styles.pcss");

interface Props {
  title?: string;
  getContextMenuItems: (row: Row<UploadSummaryTableRow>) => React.ReactElement;
  onSelect: (
    rows: Row<UploadSummaryTableRow>[],
    isDeselecting: boolean
  ) => void;
  uploads: UploadSummaryTableRow[];
}

enum SortType {
  DATE = "date",
  DEFAULT = "text",
}

const COLUMNS: Column<UploadSummaryTableRow>[] = [
  {
    accessor: "status",
    Cell: StatusCell,
    description: "Status of the upload",
    filter: FilterType.SELECTION,
    Filter: Filter({ type: FilterType.SELECTION, options: JOB_STATUSES }),
    id: "Status",
    width: 85,
  },
  {
    accessor: "jobName",
    description: "Name of the file uploaded",
    id: "File Name",
    width: 350,
  },
  {
    accessor: "created",
    Cell: function Cell(props: CellProps<UploadSummaryTableRow>) {
      return (
        <ReadOnlyCell
          {...props}
          value={props.value.toLocaleString(undefined, {
            timeZone: "America/Los_Angeles",
          })}
        />
      );
    },
    description: "Time the file upload began",
    Filter: Filter({ type: FilterType.DATE }),
    filter: FilterType.DATE,
    id: "Created",
    sortType: "datetime",
  },
  {
    accessor: "template",
    description: "Template and template version the file was uploaded with",
    id: "Template",
  },
  {
    accessor: "fileId",
    description: "Unique FMS ID assigned to the uploaded file",
    id: "File ID",
  },
  {
    accessor: "filePath",
    description: "Unique FMS File Path assigned to the uploaded file",
    id: "FMS File Path",
  },
];

// Custom sorting methods for react-table
const SORT_TYPES: Record<string, SortByFn<UploadSummaryTableRow>> = {
  [SortType.DATE]: (rowA, rowB, columnId) =>
    rowA.values[columnId] >= rowB.values[columnId] ? 1 : -1,
  [SortType.DEFAULT]: (rowA, rowB, columnId) =>
    `${rowA.values[columnId]}`.localeCompare(`${rowB.values[columnId]}`),
};

// Custom filtering methods for react-table
const FILTER_TYPES: Record<string, FilterValue> = {
  [FilterType.DATE]: (
    rows: Row<UploadSummaryTableRow>[],
    columnId: string,
    filterValue: FilterValue
  ) =>
    rows.filter(
      (row) =>
        row.values[columnId].getDate() === filterValue.getDate() &&
        row.values[columnId].getMonth() === filterValue.getMonth() &&
        row.values[columnId].getFullYear() === filterValue.getFullYear()
    ),
  [FilterType.SELECTION]: (
    rows: Row<UploadSummaryTableRow>[],
    columnId: string,
    filterValue: FilterValue
  ) => rows.filter((row) => filterValue.includes(row.values[columnId])),
};

/**
 * Component for rendering a table of past uploads. This table utilizes react-table
 * to produce a dynamic table with a few common features like filtering and
 * sorting.
 */
export default function UploadTable(props: Props) {
  const data = React.useMemo(() => props.uploads, [props.uploads]);
  const columns = React.useMemo(
    () => [
      {
        id: "selection",
        disableResizing: true,
        Header: function Header(hp: HeaderProps<UploadSummaryTableRow>) {
          return <SelectionHeader {...hp} onSelect={props.onSelect} />;
        },
        Cell: function Cell(cp: CellProps<UploadSummaryTableRow>) {
          return <SelectionCell {...cp} onSelect={props.onSelect} />;
        },
        maxWidth: 35,
      },
      ...COLUMNS,
    ],
    [props.onSelect]
  );

  const tableInstance: TableInstance<UploadSummaryTableRow> =
    useTable<UploadSummaryTableRow>(
      {
        columns,
        data,
        // Defines the default column properties, can be overriden per column
        defaultColumn: {
          Cell: ReadOnlyCell,
          Header: DefaultHeader,
          Filter: Filter({ type: FilterType.TEXT }),
          minWidth: 30,
          maxWidth: 1000,
          width: 200,
          sortType: SortType.DEFAULT,
        },
        getRowId: (row) => row.jobId,
        // Prevents sorts from reseting after data is modified
        autoResetSortBy: false,
        // Prevents filters from reseting after data is modified
        autoResetFilters: false,
        // Prevent selections from resetting after data is modified
        autoResetSelectedRows: false,
        // Extra filter types -> their implementations
        filterTypes: FILTER_TYPES,
        // Extra sort types -> their implementations
        sortTypes: SORT_TYPES,
      },
      // optional plugins
      useFilters,
      useSortBy,
      useRowSelect,
      useBlockLayout, // Makes element widths adjustable
      useResizeColumns
    );

  return (
    <div className={styles.container}>
      {props.title && <h3 className={styles.tableTitle}>{props.title}</h3>}
      <Table
        className={styles.tableContainer}
        tableInstance={tableInstance}
        getContextMenuItems={props.getContextMenuItems}
      />
      {!tableInstance.rows.length && (
        <div className={styles.emptyContainer}>
          <Empty description={`No ${props.title} Found`} />
        </div>
      )}
    </div>
  );
}

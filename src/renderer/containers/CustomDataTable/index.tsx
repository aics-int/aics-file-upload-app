import React from "react";
import { useSelector } from "react-redux";
import {
  useTable,
  useExpanded,
  useRowSelect,
  useSortBy,
  useBlockLayout,
  useResizeColumns,
  SortByFn,
  Row,
  TableInstance,
} from "react-table";

import { AnnotationName } from "../../constants";
import { getMassEditRow } from "../../state/selection/selectors";
import { getAppliedTemplate } from "../../state/template/selectors";
import { FileModel } from "../../state/types";
import { getUploadAsTableRows } from "../../state/upload/selectors";
import { useHiddenColumns } from "../../util/hooks";
import MassEditTable from "../MassEditTable";
import Table from "../Table";
import DefaultCell from "../Table/DefaultCells/DefaultCell";
import DefaultHeader from "../Table/Headers/DefaultHeader";

import {
  getCanShowImagingSessionColumn,
  getCanShowWellColumn,
  getColumnsForTable,
} from "./selectors";
import TableToolHeader from "./TableToolHeader";
import { CustomColumn } from "./types";

const ARRAY_SORT = "ARRAY_SORT";

interface Props {
  hasSubmitBeenAttempted: boolean;
}

// Custom sorting methods for react-table
const sortTypes: Record<string, SortByFn<FileModel>> = {
  [ARRAY_SORT]: (
    rowA: Row<FileModel>,
    rowB: Row<FileModel>,
    columnId: string
  ) => `${rowA.original[columnId]}`.localeCompare(`${rowB.original[columnId]}`),
};

/*
  This componenet is responsible for rendering the table users enter their
  custom data into. The majority of this component is ruled by the utility
  package "react-table." This works by supplying the row data & column
  definitions to react-table's "useTable" hook which then provides hooks
  to use to turn a display table into an interactive table with a lot
  of the logic like row selection managed for us. Majority of the logic
  can be found by finding the "Cell" component specified by the column.
*/
export default function CustomDataTable({ hasSubmitBeenAttempted }: Props) {
  const rows = useSelector(getUploadAsTableRows);
  const template = useSelector(getAppliedTemplate);
  const isMassEditing = useSelector(getMassEditRow);
  const columnDefinitions = useSelector(getColumnsForTable);
  const canShowWellColumn = useSelector(getCanShowWellColumn);
  const canShowImagingSessionColumn = useSelector(
    getCanShowImagingSessionColumn
  );

  const data = React.useMemo(() => rows, [rows]);
  const columns: CustomColumn[] = React.useMemo(
    () =>
      columnDefinitions.map((column) => ({
        ...column,
        hasSubmitBeenAttempted,
      })),
    [columnDefinitions, hasSubmitBeenAttempted]
  );

  const tableInstance: TableInstance<FileModel> = useTable<FileModel>(
    {
      columns,
      data,
      // Defines the default column properties, can be overridden per column
      defaultColumn: {
        Cell: DefaultCell,
        Header: DefaultHeader,
        minWidth: 30,
        width: 150,
        maxWidth: 500,
        sortType: ARRAY_SORT,
      },
      getRowId: (row) => row.file,
      // Prevent hidden columns from resetting on data changes
      autoResetHiddenColumns: false,
      // This comes from the useExpanded plugin and prevents
      // sorting from reseting after data is modified - Sean M 03/23/21
      autoResetExpanded: false,
      // Similarly to the above property this comes from a plugin, useSortBy,
      // and prevents sorting from reseting after data is modified
      autoResetSortBy: false,
      // Prevent selections from resetting on data changes
      autoResetSelectedRows: false,
      // This comes from the useSortBy plugin and adds additional sorting
      // options as a function of the column's "sortType" specified.
      // This is currently necessary since the row values are arrays
      // for which react-table does not handle by default.
      // See useSortBy plugin - Sean M 03/23/21
      sortTypes,
    },
    // optional plugins
    useSortBy,
    useExpanded,
    useRowSelect,
    useBlockLayout, // Makes element widths adjustable
    useResizeColumns
  );

  const columnsToHide = [
    ...(canShowImagingSessionColumn ? [] : [AnnotationName.IMAGING_SESSION]),
    ...(canShowWellColumn ? [] : [AnnotationName.WELL]),
  ];
  useHiddenColumns(tableInstance, columnsToHide);

  if (!template || !data.length) {
    return null;
  }

  // Map columns to their widths to persist the widths in the MassEditTable as well
  const columnToWidthMap = tableInstance.allColumns.reduce(
    (mapSoFar, column) => ({
      ...mapSoFar,
      [column.id]: column.width,
    }),
    {}
  );

  return (
    <>
      {isMassEditing && <MassEditTable columnToWidthMap={columnToWidthMap} />}
      <TableToolHeader selectedRows={tableInstance.selectedFlatRows || []} />
      <Table tableInstance={tableInstance} />
    </>
  );
}

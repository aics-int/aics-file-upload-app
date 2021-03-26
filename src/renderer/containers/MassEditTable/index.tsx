import { Alert, Button } from "antd";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { useBlockLayout, useResizeColumns, useTable } from "react-table";

import { NOTES_ANNOTATION_NAME } from "../../constants";
import { ROW_COUNT_COLUMN } from "../../state/constants";
import { applyMassEdit, cancelMassEdit } from "../../state/selection/actions";
import { getMassEditRowAsTableRow } from "../../state/selection/selectors";
import { getTemplateColumnsForTable } from "../CustomDataTable/selectors";
import Table from "../Table";
import NotesCell from "../Table/CustomCells/NotesCell";
import DefaultCell from "../Table/DefaultCells/DefaultCell";
import ReadOnlyCell from "../Table/DefaultCells/ReadOnlyCell";
import DefaultHeader from "../Table/Headers/DefaultHeader";

const styles = require("./styles.pcss");

const DEFAULT_COLUMNS = [
  {
    accessor: ROW_COUNT_COLUMN,
    Cell: ReadOnlyCell,
    description: "Number of rows this edit will be applied to",
    width: 75,
  },
  {
    accessor: NOTES_ANNOTATION_NAME,
    Cell: NotesCell,
    description: "Any additional text data (not ideal for querying)",
    maxWidth: 50,
  },
];

/*
  This component is responsible for rendering a one row table meant to apply
  edits to pre-selected upload files in bulk. This works by supplying the row
  data & column definitions to react-table's "useTable" hook which then 
  provides hooks to use to turn a display table into an interactive table
  with a lot of the logic managed for us. Majority of the logic we implement
  can be found by finding the "Cell" component specified by the column.
*/
export default function MassEditTable() {
  const dispatch = useDispatch();
  const row = useSelector(getMassEditRowAsTableRow);
  const templateColumns = useSelector(getTemplateColumnsForTable);

  const data: any[] = React.useMemo(() => [row], [row]);
  const columns = React.useMemo(
    () => [...DEFAULT_COLUMNS, ...templateColumns],
    [templateColumns]
  );

  const tableInstance = useTable(
    {
      columns,
      // Defines the default column properties, can be overriden per column
      defaultColumn: {
        Cell: DefaultCell,
        Header: DefaultHeader,
        minWidth: 30,
        width: 150,
        maxWidth: 500,
      },
      data,
    },
    // optional plugins
    useBlockLayout, // Makes element widths adjustable
    useResizeColumns
  );

  return (
    <>
      <div className={styles.shadowBox} />
      <div className={styles.massEditTableContainer}>
        <Alert
          closable
          className={styles.hint}
          message="Hint: Make edits below and all edits will be applied to selected rows. Click Apply to complete changes."
          showIcon={true}
          type="info"
          key="hint"
        />
        <Table tableInstance={tableInstance} />
        <div className={styles.buttonRow}>
          <Button
            className={styles.cancelButton}
            onClick={() => dispatch(cancelMassEdit())}
          >
            Cancel
          </Button>
          <Button
            className={styles.applyButton}
            onClick={() => dispatch(applyMassEdit())}
          >
            Apply
          </Button>
        </div>
      </div>
    </>
  );
}

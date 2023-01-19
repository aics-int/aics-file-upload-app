import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { CellProps } from "react-table";

import { ColumnType } from "../../../services/labkey-client/types";
import { FileModel } from "../../../state/types";
import { updateUpload } from "../../../state/upload/actions";
import { Duration } from "../../../types";
import BooleanEditor from "../Editors/BooleanEditor";
import DateEditor from "../Editors/DateEditor";
import DropdownEditor from "../Editors/DropdownEditor";
import DurationEditor from "../Editors/DurationEditor";
import LookupEditor from "../Editors/LookupEditor";
import TextEditor from "../Editors/TextEditor";
import { ColumnValue } from "../types";

import DisplayCell from "./DisplayCell";

/*
  This component is responsible by default for react-tables for
  displaying the value supplied as well as creating an interactive
  editor based on the column's annotation type
*/
export default function DefaultCell(props: CellProps<FileModel, ColumnValue>) {
  const { column, value } = props;
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);

  function commitChanges(value: ColumnValue) {
    setIsEditing(false);
    dispatch(updateUpload(props.row.id, { [props.column.id]: value }));
  }

  if (isEditing) {
    switch (column.type) {
      case ColumnType.BOOLEAN:
        return (
          <BooleanEditor
            initialValue={value as boolean[]}
            commitChanges={commitChanges}
          />
        );
      case ColumnType.TEXT:
      case ColumnType.NUMBER:
        return (
          <TextEditor
            initialValue={value as string[]}
            commitChanges={commitChanges}
          />
        );
      case ColumnType.DURATION:
        return (
          <DurationEditor
            initialValue={value as Duration[]}
            commitChanges={commitChanges}
          />
        );
      case ColumnType.DROPDOWN:
        return (
          <DropdownEditor
            initialValue={value as string[]}
            options={column?.dropdownValues ?? []}
            commitChanges={commitChanges}
          />
        );
      case ColumnType.LOOKUP:
        return (
          <LookupEditor
            initialValue={value as string[]}
            lookupAnnotationName={column.id}
            lookupTable={column?.lookupTable}
            commitChanges={commitChanges}
          />
        );
      case ColumnType.DATE:
      case ColumnType.DATETIME:
        return (
          <DateEditor
            initialValue={value as Date[]}
            column={column}
            commitChanges={commitChanges}
          />
        );
      default:
        // Error-case shouldn't occur
        console.error("Invalid column type", props.column.type);
        return null;
    }
  }

  return <DisplayCell {...props} onStartEditing={() => setIsEditing(true)} />;
}

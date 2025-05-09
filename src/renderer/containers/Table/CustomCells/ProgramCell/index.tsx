import { Select } from "antd";
import { castArray } from "lodash";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps } from "react-table";

import { getProgramOptions } from "../../../../state/metadata/selectors";
import { requestProgramOptions } from "../../../../state/metadata/actions";
import { FileModel } from "../../../../state/types";
import { updateUpload } from "../../../../state/upload/actions";
import DisplayCell from "../../DefaultCells/DisplayCell";
import { AnnotationOption } from "../../../../services/labkey-client/types";


const { Option } = Select;

export default function ProgramCell(props: CellProps<FileModel, string[]>) {
  const dispatch = useDispatch();

  const programOptions = useSelector(getProgramOptions);
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState<string | undefined>(props.value?.[0]);

  // Load program options once
  useEffect(() => {
    if (!programOptions.length) {
      dispatch(requestProgramOptions());
    }
  }, [dispatch, programOptions.length]);

  // Sync local value with prop changes
  useEffect(() => {
    setValue(props.value?.[0]);
  }, [props.value]);

  function onCommit(program = value) {
    setIsEditing(false);
    dispatch(
      updateUpload(props.row.id, {
        [props.column.id]: castArray(program),
      })
    );
  }

  return isEditing ? (
    <Select
      autoFocus
      defaultOpen
      value={value}
      onChange={(val) => {
        setValue(val);
        onCommit(val);
      }}
      onBlur={() => onCommit()}
      placeholder="Select program"
      style={{ width: "100%" }}
    >
      {programOptions.map((opt: AnnotationOption) => (
        <Option key={opt.annotationOptionId} value={opt.value}>
          {opt.value}
        </Option>
      ))}
    </Select>
  ) : (
    <DisplayCell
      {...props}
      onTabExit={() => setIsEditing(false)}
      onStartEditing={() => setIsEditing(true)}
    />
  );
}
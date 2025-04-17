import { Select } from "antd";
import { castArray } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps } from "react-table";

import { AnnotationName } from "../../../../constants";
import { getAnnotations, getAnnotationOptions } from "../../../../state/metadata/selectors";
import { FileModel } from "../../../../state/types";
import { updateUpload } from "../../../../state/upload/actions";
import DisplayCell from "../../DefaultCells/DisplayCell";

const { Option } = Select;

export default function ProgramCell(props: CellProps<FileModel, string[]>) {
  const dispatch = useDispatch();

  const annotations = useSelector(getAnnotations);
  const options = useSelector(getAnnotationOptions);

  // Get options for program annotation
  const programAnnotation = annotations.find(a => a.name === AnnotationName.PROGRAM);
  const programOptions = programAnnotation
    ? options.filter(opt => opt.annotationId === programAnnotation.annotationId)
    : [];

  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState<string | undefined>(props.value?.[0]);

  // Derive state from changes outside of direct editing
  React.useEffect(() => {
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
      onBlur={() => onCommit()} // commit if user clicks outside dropdown (keeps selection)
      placeholder="Select program"
      style={{ width: "100%" }}
    >
      {programOptions.map((opt) => (
        <Option key={opt.value} value={opt.value}>
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

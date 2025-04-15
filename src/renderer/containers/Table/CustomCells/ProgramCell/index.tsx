import { castArray } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Select } from "antd";
import { CellProps } from "react-table";

import { AnnotationName } from "../../../../constants";
import { getAnnotations, getAnnotationOptions } from "../../../../state/metadata/selectors";
import { updateUpload } from "../../../../state/upload/actions";
import { FileModel } from "../../../../state/types";
import DisplayCell from "../../DefaultCells/DisplayCell";

const { Option } = Select;

export default function ProgramCell(props: CellProps<FileModel, string[]>) {
  const dispatch = useDispatch();

  const annotations = useSelector(getAnnotations);
  const options = useSelector(getAnnotationOptions);

  const programAnnotation = annotations.find(a => a.name === AnnotationName.PROGRAM);
  const programOptions = programAnnotation
    ? options.filter(opt => opt.annotationId === programAnnotation.annotationId)
    : [];

  const [isEditing, setIsEditing] = React.useState(false);
  const [value, setValue] = React.useState<string | undefined>(props.value?.[0]);

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
      onBlur={() => onCommit()}
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

import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps } from "react-table";

import { AnnotationName, IMAGING_SESSION_NONE } from "../../../../constants";
import { getPlateBarcodeToPlates } from "../../../../state/metadata/selectors";
import { FileModel } from "../../../../state/types";
import { updateUpload } from "../../../../state/upload/actions";
import DisplayCell from "../../DefaultCells/DisplayCell";
import DropdownEditor from "../../Editors/DropdownEditor";
import { ColumnValue } from "../../types";

/**
 * Component used in a react-table table to render a selection between
 * imaging sessions viable for the given plate barcode, or "None" if there
 * are none
 */
export default function ImagingSessionCell(
  props: CellProps<FileModel, string[]>
) {
  const { value } = props;
  const dispatch = useDispatch();
  const plateBarcodeToPlates = useSelector(getPlateBarcodeToPlates);
  const [isEditing, setIsEditing] = React.useState(false);

  const plateBarcode = props.row.original[AnnotationName.PLATE_BARCODE]?.[0];
  const plates = plateBarcodeToPlates[plateBarcode || ""] || [];
  const plateImagingSessionNames = plates
    .map((is) => is.name)
    .filter((n) => !!n) as string[];
  const imagingSessionNames = plateImagingSessionNames.length
    ? plateImagingSessionNames
    : [IMAGING_SESSION_NONE];

  function commitChanges(value: ColumnValue) {
    setIsEditing(false);
    dispatch(
      updateUpload(props.row.id, {
        [props.column.id]: value,
      })
    );
  }

  if (isEditing) {
    return (
      <DropdownEditor
        disableMultiSelect
        initialValue={value}
        options={imagingSessionNames}
        commitChanges={commitChanges}
      />
    );
  }

  function onStartEditing() {
    if (imagingSessionNames.length) {
      setIsEditing(true);
    }
  }

  return (
    <DisplayCell
      {...props}
      disabled={!imagingSessionNames.length}
      onStartEditing={onStartEditing}
    />
  );
}

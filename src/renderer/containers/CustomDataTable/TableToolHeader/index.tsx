import { DeleteOutlined, EditOutlined, RedoOutlined, UndoOutlined } from "@ant-design/icons";
import { Button, Tooltip } from "antd";
import { isEmpty } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row } from "react-table";

import { TOOLTIP_ENTER_DELAY, TOOLTIP_LEAVE_DELAY } from "../../../constants";
import { startMassEdit } from "../../../state/selection/actions";
import {
  getIsExistingUpload,
  getAreSelectedUploadsInFlight,
} from "../../../state/selection/selectors";
import { FileModel, TutorialStep } from "../../../state/types";
import { jumpToUpload, removeUploads } from "../../../state/upload/actions";
import {
  getCanRedoUpload,
  getCanUndoUpload,
} from "../../../state/upload/selectors";
import TutorialTooltip from "../../TutorialTooltip";

const styles = require("./styles.pcss");

interface Props {
  selectedRows: Row<FileModel>[];
}

/*
  TableToolHeader renders a header tool bar meant for the top
  of the CustomDataTable.
*/
export default function TableToolHeader(props: Props) {
  const dispatch = useDispatch();
  const canUndo = useSelector(getCanUndoUpload);
  const canRedo = useSelector(getCanRedoUpload);
  const isReadOnly = useSelector(getAreSelectedUploadsInFlight);
  const isExistingUpload = useSelector(getIsExistingUpload);
  const selectedRowIds = props.selectedRows.map((row) => row.id);

  if (isReadOnly) {
    return null;
  }

  return (
    <div className={styles.tableToolHeader}>
      <Tooltip
        title="Undo"
        mouseEnterDelay={TOOLTIP_ENTER_DELAY}
        mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
      >
        <Button
          onClick={() => dispatch(jumpToUpload(-1))}
          disabled={!canUndo}
          icon={<UndoOutlined />}
          type="link"
        />
      </Tooltip>
      <Tooltip
        title="Redo"
        mouseEnterDelay={TOOLTIP_ENTER_DELAY}
        mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
      >
        <Button
          onClick={() => dispatch(jumpToUpload(1))}
          disabled={!canRedo}
          icon={<RedoOutlined />}
          type="link"
        />
      </Tooltip>
      <TutorialTooltip
        placement="right"
        step={TutorialStep.MASS_EDIT}
        title="Mass Edit"
        message="Select rows and click here to edit multiple rows at once"
      >
        <Tooltip
          title="Edit Selected Rows All at Once"
          mouseEnterDelay={TOOLTIP_ENTER_DELAY}
          mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
        >
          <Button
            onClick={() => dispatch(startMassEdit(selectedRowIds))}
            disabled={isEmpty(props.selectedRows)}
            icon={<EditOutlined />}
            type="link"
          />
        </Tooltip>
      </TutorialTooltip>
      <Tooltip
        title="Delete Selected Rows"
        mouseEnterDelay={TOOLTIP_ENTER_DELAY}
        mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
      >
        <Button
          onClick={() => dispatch(removeUploads(selectedRowIds))}
          disabled={isEmpty(props.selectedRows) || isExistingUpload}
          icon={<DeleteOutlined />}
          type="link"
        />
      </Tooltip>
    </div>
  );
}

import * as fs from "fs";

import {
  FileTextOutlined,
  FormOutlined,
  PlusCircleOutlined,
} from "@ant-design/icons";
import { Dropdown, Input, Menu, Modal, Tooltip } from "antd";
import { castArray } from "lodash";
import React from "react";
import { useDispatch } from "react-redux";
import { CellProps } from "react-table";
import { Dispatch } from "redux";

import DragAndDrop from "../../../../components/DragAndDrop";
import {
  TOOLTIP_ENTER_DELAY,
  TOOLTIP_LEAVE_DELAY,
} from "../../../../constants";
import { setAlert } from "../../../../state/feedback/actions";
import { AlertType, FileModel } from "../../../../state/types";
import { updateUpload } from "../../../../state/upload/actions";

const styles = require("./styles.pcss");

const { TextArea } = Input;

type Props = CellProps<FileModel, string>;

function getContextMenuItems(dispatch: Dispatch, props: Props, notes?: string) {
  return (
    <Menu>
      <Menu.Item
        key="1"
        disabled={!notes}
        onClick={() => {
          navigator.clipboard.writeText(notes || "");
          dispatch(
            updateUpload(props.row.id, {
              [props.column.id]: undefined,
            })
          );
        }}
      >
        Cut
      </Menu.Item>
      <Menu.Item
        key="2"
        disabled={!notes}
        onClick={() => {
          navigator.clipboard.writeText(notes || "");
        }}
      >
        Copy
      </Menu.Item>
      <Menu.Item
        key="3"
        onClick={async () => {
          const pastedText = await navigator.clipboard.readText();
          const trimmedText = pastedText.trim();
          dispatch(
            updateUpload(props.row.id, {
              [props.column.id]: trimmedText ? [trimmedText] : undefined,
            })
          );
        }}
      >
        Paste
      </Menu.Item>
      <Menu.Item
        key="4"
        disabled={!notes}
        onClick={() => {
          dispatch(
            updateUpload(props.row.id, {
              [props.column.id]: undefined,
            })
          );
        }}
      >
        Delete
      </Menu.Item>
    </Menu>
  );
}

async function readTextFile(
  filePaths: string[],
  onErrorCallback: (error: string) => void
): Promise<string> {
  if (filePaths.length > 1) {
    onErrorCallback(`Unexpected number of files dropped: ${filePaths.length}.`);
    return "";
  }
  if (filePaths.length < 1) {
    return "";
  }
  try {
    const notesBuffer = await fs.promises.readFile(filePaths[0]);
    const notes = notesBuffer.toString();
    if (!notes) {
      onErrorCallback("No notes found in file.");
    }
    return notes;
  } catch (err) {
    // It is possible for a user to select a directory
    onErrorCallback("Invalid file or directory selected (.txt only)");
    return "";
  }
}

/**
  This component is for rendering notes related to files and managing different
  modes of editing them. It also contains static methods for reading
  .txt files from drag or drop events.
 */
function NotesCell(props: Props) {
  const dispatch = useDispatch();
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(
    !props.value || !props.value.length
  );
  const [notes, setNotes] = React.useState<string[]>(
    props.value ? castArray(props.value) : []
  );
  const note = notes.length ? notes[0] : undefined;

  async function onDrop(filePaths: string[]) {
    const notes = await readTextFile(filePaths, (error) =>
      dispatch(
        setAlert({
          message: error,
          type: AlertType.WARN,
        })
      )
    );
    setNotes([notes]);
  }

  function onOk() {
    setIsEditing(false);
    setIsModalOpen(false);
    const trimmedNotes = note?.trim();
    dispatch(
      updateUpload(props.row.id, {
        [props.column.id]: trimmedNotes ? [trimmedNotes] : undefined,
      })
    );
  }

  function onCancel() {
    setIsEditing(false);
    setIsModalOpen(false);
    setNotes(props.value ? castArray(props.value) : []);
  }

  return (
    <>
      <Modal
        width="90%"
        title={props.column.isReadOnly ? "View Notes" : "Add Notes"}
        visible={isModalOpen}
        onOk={onOk}
        onCancel={onCancel}
        okText={props.column.isReadOnly ? "Done" : "Save"}
      >
        {isEditing ? (
          <DragAndDrop onDrop={onDrop}>
            <TextArea
              className={styles.useFullWidth}
              onChange={(e) => setNotes([e.target.value])}
              placeholder="Type notes for file here or drag/drop a file below"
              autoSize={{ minRows: 4, maxRows: 12 }}
              value={note}
            />
            <p className={styles.dragAndDropNote}>
              <strong>Note:</strong> Notes must be file type .txt
            </p>
            <DragAndDrop onDrop={onDrop} />
          </DragAndDrop>
        ) : (
          <>
            {!props.column.isReadOnly && (
              <FormOutlined
                className={styles.formIcon}
                onClick={() => setIsEditing(true)}
              />
            )}
            {/* New line formatting might be important for viewing, so preserve it in view */}
            {note?.split("\n").map((line, i) => (
              // Using an index as a key is not recommended, but it is safe in
              // this case
              <p key={i}>{line}</p>
            ))}
          </>
        )}
      </Modal>
      <Tooltip
        title={note ? `${note?.substring(0, 50)}...` : ""}
        mouseEnterDelay={TOOLTIP_ENTER_DELAY}
        mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
      >
        <Dropdown
          overlay={getContextMenuItems(dispatch, props, note)}
          trigger={["contextMenu"]}
        >
          {(!props.column.isReadOnly || notes) &&
            (note ? (
              <FileTextOutlined
                className={styles.iconDisplay}
                onClick={() => setIsModalOpen(true)}
              />
            ) : (
              <PlusCircleOutlined
                className={styles.iconDisplay}
                onClick={() => setIsModalOpen(true)}
              />
            ))}
        </Dropdown>
      </Tooltip>
    </>
  );
}

export default function NotesCellWrapper(props: Props) {
  return <NotesCell {...props} key={props.value} />;
}

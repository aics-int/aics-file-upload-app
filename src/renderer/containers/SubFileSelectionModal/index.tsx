import { basename } from "path";

import { Alert, Modal, Select } from "antd";
import { isEmpty } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import LabeledInput from "../../components/LabeledInput";
import PrinterFormatInput from "../../components/PrinterFormatInput";
import { getChannels } from "../../state/metadata/selectors";
import { closeSubFileSelectionModal } from "../../state/selection/actions";
import { getSubFileSelectionModalFile } from "../../state/selection/selectors";
import { updateSubImages } from "../../state/upload/actions";
import { getUploadRowKey } from "../../state/upload/constants";
import { getUploadAsTableRows } from "../../state/upload/selectors";

import SubImageInput, { SubImageType } from "./SubImageInput";

const styles = require("./styles.pcss");

/*
  This modal allows users to add scenes, positions, channels, or
  custom "sub image names" to their files.
*/
function SubFileSelectionModal({ file }: { file: string }) {
  const dispatch = useDispatch();
  const channelOptions = useSelector(getChannels);
  const uploads = useSelector(getUploadAsTableRows);

  // Determine initial state from corresponding upload row
  const row = React.useMemo(() => {
    const row = uploads.find(({ file: fileName }) => fileName === file);
    let initialSubImageType;
    if (!isEmpty(row?.subImageNames)) {
      initialSubImageType = SubImageType.GENERIC;
    } else if (!isEmpty(row?.scenes)) {
      initialSubImageType = SubImageType.SCENE;
    } else {
      initialSubImageType = SubImageType.POSITION;
    }
    return {
      fileName: basename(file),
      fileOptions: uploads.map(({ file }) => file),
      initialSubImageType,
      initialPositions: row?.positionIndexes.join(", ") || "",
      initialChannels: row?.channelIds || [],
      initialSubImageNames: row?.subImageNames || [],
      initialScenes: row?.scenes.join(", ") || "",
    };
  }, [uploads, file]);

  const [files, setFiles] = React.useState<string[]>([file]);
  const [channelIds, setChannelIds] = React.useState<string[]>(
    row.initialChannels
  );
  const [positionIndexes, setPositionIndexes] = React.useState<string>(
    row.initialPositions
  );
  const [scenes, setScenes] = React.useState<string>(row.initialScenes);
  const [subImageNames, setSubImageNames] = React.useState<string[]>(
    row.initialSubImageNames
  );
  const [subImageType, setSubImageType] = React.useState<SubImageType>(
    row.initialSubImageType
  );
  const [error, setError] = React.useState<string>();

  function onSubmit() {
    files.forEach((selectedFile: string) => {
      const row = uploads.find(
        (upload) =>
          getUploadRowKey(upload) === getUploadRowKey({ file: selectedFile })
      );
      if (row) {
        dispatch(
          updateSubImages(row, {
            positionIndexes:
              PrinterFormatInput.extractValues(positionIndexes) || [],
            channelIds,
            scenes: PrinterFormatInput.extractValues(scenes) || [],
            subImageNames,
          })
        );
      }
    });
  }

  const canSubmit =
    !error &&
    (!isEmpty(channelIds) ||
      !isEmpty(positionIndexes) ||
      !isEmpty(scenes) ||
      !isEmpty(subImageNames));

  return (
    <Modal
      visible
      width="50%"
      title={`Adjust scenes, positions, & channels for ${row.fileName}`}
      onOk={onSubmit}
      onCancel={() => dispatch(closeSubFileSelectionModal())}
      okButtonProps={{ disabled: !canSubmit }}
    >
      <p className={styles.modalHelpText}>
        If this is a microscopy image (3i, czi, ome.tiff, lif) you can add
        scenes, positions, sub images or channels. This will allow you to add
        annotations for specific scenes and channels within a file.
      </p>
      <Alert
        className={styles.alert}
        type="warning"
        showIcon={true}
        closable={true}
        message="Adding scenes, positions, or sub image names will clear out direct file-well associations made on the previous page"
      />
      {files.length > 1 && (
        <Alert
          className={styles.alert}
          type="warning"
          showIcon={true}
          closable={true}
          message="Adding scenes/channels to other files removes scenes/channels they already have"
        />
      )}
      <LabeledInput label="Files">
        <Select
          className={styles.input}
          allowClear={true}
          onChange={setFiles}
          placeholder="Select Files"
          mode="tags"
          value={files}
        >
          {row.fileOptions.map((file: string) => (
            <Select.Option key={file} value={file}>
              {file}
            </Select.Option>
          ))}
        </Select>
      </LabeledInput>
      <SubImageInput
        onValidationError={setError}
        positionIndexes={positionIndexes}
        subImageNames={subImageNames}
        scenes={scenes}
        subImageType={subImageType}
        setPositionIndexes={setPositionIndexes}
        setSubImageNames={setSubImageNames}
        setScenes={setScenes}
        setSubImageType={setSubImageType}
      />
      <LabeledInput label="Channels">
        <Select
          className={styles.input}
          allowClear={true}
          onChange={(ids: any) => setChannelIds(ids)}
          placeholder="Select Channels"
          mode="tags"
          value={channelIds}
        >
          {channelOptions.map(({ channelId }) => (
            <Select.Option key={channelId} value={channelId}>
              {channelId}
            </Select.Option>
          ))}
        </Select>
      </LabeledInput>
      {error && (
        <Alert
          className={styles.alert}
          type="error"
          showIcon={true}
          message={error}
        />
      )}
    </Modal>
  );
}

// Wrap SubFileSelectionModal so that it recreates on every
// file prop change rather than re-render
export default function SubFileSelectionModalWrapper() {
  const file = useSelector(getSubFileSelectionModalFile);
  if (!file) {
    return null;
  }
  return <SubFileSelectionModal file={file} />;
}

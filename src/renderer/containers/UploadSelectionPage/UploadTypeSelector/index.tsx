import { CopyOutlined, FileOutlined } from "@ant-design/icons";
import { Radio, RadioChangeEvent } from "antd";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { selectUploadType } from "../../../state/selection/actions";
import { getUploadType } from "../../../state/selection/selectors";
import { UploadType } from "../../../types";

const styles = require("./styles.pcss");

export default function UploadTypeSelector() {
  const dispatch = useDispatch();

  const uploadType = useSelector(getUploadType);

  const onChange = (e: RadioChangeEvent) => {
    dispatch(selectUploadType(e.target.value));
  };

  // Help text below the radio group. Defaults to the text for UploadType.File
  let additionalHelpText = `Select one or more standalone files. Selecting ${UploadType.Multifile}s or folders will result in an error.`;
  if (uploadType === UploadType.Multifile) {
    additionalHelpText = `Select one or more ${UploadType.Multifile} folders. Each folder in your selection will be uploaded as a single FMS record.`;
  }

  return (
    <div>
      <h1>Select an upload type</h1>
      <Radio.Group
        buttonStyle="solid"
        className={styles.radioGroup}
        value={uploadType}
      >
        <Radio.Button
          value={UploadType.File}
          className={styles.radioButton}
          onChange={onChange}
        >
          <div className={styles.radioButtonContent}>
            <FileOutlined className={styles.radioButtonIcon} />
            <div className={styles.radioButtonText}>
              <span className={styles.radioButtonTitle}>{UploadType.File}</span>
              <br />
              <span className={styles.radioButtonHelpText}>
                A single file such as a .czi, .ome.tiff, .csv, etc.
              </span>
            </div>
          </div>
        </Radio.Button>
        <Radio.Button
          value={UploadType.Multifile}
          className={styles.radioButton}
          onChange={onChange}
        >
          <div className={styles.radioButtonContent}>
            <CopyOutlined className={styles.radioButtonIcon} />
            <div className={styles.radioButtonText}>
              <span className={styles.radioButtonTitle}>
                {UploadType.Multifile}
              </span>
              <br />
              <span className={styles.radioButtonHelpText}>
                Distributed file formats such as .zarr, .sldy, etc.
              </span>
            </div>
          </div>
        </Radio.Button>
      </Radio.Group>
      {uploadType !== null && (
        <div className={styles.additionalHelpText}>{additionalHelpText}</div>
      )}
    </div>
  );
}

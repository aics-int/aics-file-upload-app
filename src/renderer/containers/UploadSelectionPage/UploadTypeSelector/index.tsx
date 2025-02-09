import { CopyOutlined, FileOutlined } from '@ant-design/icons';
import { Radio, RadioChangeEvent } from 'antd';
import React from 'react';
import { useDispatch, useSelector } from "react-redux";

import { selectUploadType } from '../../../state/selection/actions';
import { getUploadType } from '../../../state/selection/selectors';
import { UploadType } from '../../../types';

const styles = require("./styles.pcss");


export default function UploadTypeSelector() {
    const dispatch = useDispatch();

    const uploadType = useSelector(getUploadType);

    const onChange = (e: RadioChangeEvent) => {
        dispatch(selectUploadType(e.target.value));
    }

    return (
        <div>
            <h1>
                Select an upload type
            </h1>
            <Radio.Group
                buttonStyle='solid'
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
                            <span className={styles.radioButtonTitle}>File</span>
                            <br />
                            <span className={styles.radioButtonHelpText}>A single file such as a .czi, .ome.tiff, .csv, etc.</span>
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
                            <span className={styles.radioButtonTitle}>Multifile</span>
                            <br />
                            <span className={styles.radioButtonHelpText}>Advanced file types such as .zarr, .sldy, etc.</span>
                        </div>
                    </div>
                </Radio.Button>
            </Radio.Group>
        </div>
    )
}
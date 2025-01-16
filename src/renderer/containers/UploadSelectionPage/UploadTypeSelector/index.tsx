import React from 'react';
import { useDispatch, useSelector } from "react-redux";
import { Radio, RadioChangeEvent } from 'antd';
import { selectUploadType } from '../../../state/selection/actions';
import { UploadType } from '../../../state/selection/types';
import { getUploadType } from '../../../state/selection/selectors';

const styles = require("./styles.pcss");


export default function UploadTypeSelector() {
    const dispatch = useDispatch();

    const uploadType = useSelector(getUploadType);

    const onChange = (e: RadioChangeEvent) => {
        dispatch(selectUploadType(e.target.value));
    }

    return (
        <div>
            <h2>
                Select an upload type
            </h2>
            <Radio.Group
                buttonStyle='solid'
                className={styles.radioGroup}
                value={uploadType}
            >
                <Radio.Button
                    value={UploadType.File}
                    onChange={onChange}
                >
                    File
                </Radio.Button>
                <Radio.Button
                    value={UploadType.Multifile}
                    onChange={onChange}
                >
                    Multifile
                </Radio.Button>
            </Radio.Group>
        </div>
    )
}
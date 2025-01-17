import React from 'react';
import { useDispatch } from "react-redux";
import { Button } from 'antd';
import { FileModel } from '../../../state/types';

const styles = require("./styles.pcss");

interface NewPageFooterProps {
    uploadList: FileModel[];
}


export default function NewPageFooter(props: NewPageFooterProps) {
    const dispatch = useDispatch();

    return (
        <div className={styles.footer}>
            <Button disabled={props.uploadList.length === 0} type="primary" className={styles.footerButton}>Continue to Metadata</Button>
            <Button className={styles.footerButton}>Cancel Upload</Button>
        </div>
    )
}
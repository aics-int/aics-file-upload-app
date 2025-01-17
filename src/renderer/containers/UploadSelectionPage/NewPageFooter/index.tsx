import React from 'react';
import { useDispatch } from "react-redux";
import { Button } from 'antd';
import { FileModel, Page } from '../../../state/types';
import { closeUpload, selectPage } from '../../../state/route/actions';

const styles = require("./styles.pcss");

interface NewPageFooterProps {
    uploadList: FileModel[];
}


export default function NewPageFooter(props: NewPageFooterProps) {
    const dispatch = useDispatch();

    const onCancel = () => {
        dispatch(closeUpload());
    }

    const onContinue = () => {
        // TODO: error checking?
        dispatch(selectPage(Page.AddMetadata));
    }
    
    return (
        <div className={styles.footer}>
            <Button
                className={styles.footerButton}
                onClick={onContinue}
                disabled={props.uploadList.length === 0}
                type="primary"
            >
                Continue to Metadata
            </Button>
            <Button
                className={styles.footerButton}
                onClick={onCancel}
            >
                Cancel Upload
            </Button>
        </div>
    )
}
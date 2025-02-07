import { basename } from 'path';

import React from 'react';

import { FileModel } from '../../../state/types';

const styles = require("./styles.pcss");


interface SelectedFilesListProps {
    uploadList: FileModel[];
}


export default function SelectedFilesList(props: SelectedFilesListProps) {
    const rows = props.uploadList.map(file => (
            <tr key={file.file}>
                <td className={styles.tableCell}>{basename(file.file)}</td>
                <td className={styles.tableCell}>{file.uploadType}</td>
            </tr>
        )
    );

    return (
        <div className={styles.container}>
            <div className={styles.tableHeader}><strong>{props.uploadList.length}</strong> items will be uploaded</div>
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <tbody>
                        {rows}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
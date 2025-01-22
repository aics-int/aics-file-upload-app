import React from 'react';

import { FileModel } from '../../../state/types';

const styles = require("./styles.pcss");


interface SelectedFilesListProps {
    uploadList: FileModel[];
}


export default function SelectedFilesList(props: SelectedFilesListProps) {
    const rows = props.uploadList.map(file => (
            <tr key={file.file}>
                <td className={styles.tableCell}>{file.file}</td>
                <td className={styles.tableCell}>{file.uploadType}</td>
            </tr>
        )
    );

    return (
        <div className={styles.container}>
            <div>{props.uploadList.length} selected file(s)</div>
            <table className={styles.table}>
                <tr>
                    <th className={styles.tableCell}>File Name</th>
                    <th className={styles.tableCell}>Upload Type</th>
                </tr>
                {rows}
            </table>
        </div>
    )
}
import React from 'react';

const styles = require("./styles.pcss");

interface NewPageFooterProps {
    children: React.ReactNode | React.ReactNode[];
}

// TODO comment
export default function PageFooter(props: NewPageFooterProps) {
    return (
        <div className={styles.footer}>
            {props.children}
        </div>
    )
}
import React from 'react';

const styles = require("./styles.pcss");

interface NewPageFooterProps {
    children: React.ReactNode | React.ReactNode[];
}

/**
 * Wrapper component for button bars that attach to the bottom of a page.
 *  Mainly useful because its styling keeps it at the bottom of its
 *  parent component.
 */
export default function PageFooter(props: NewPageFooterProps) {
    return (
        <div className={styles.footer}>
            {props.children}
        </div>
    )
}
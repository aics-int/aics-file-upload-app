import { Icon, Tooltip } from "antd";
import * as classNames from "classnames";
import { ReactNode, ReactNodeArray } from "react";
import * as React from "react";

const styles = require("./styles.pcss");

interface Props {
    children?: ReactNode | ReactNodeArray;
    className?: string;
    error?: string;
    label?: string;
}

/**
 * Wrapper around any kind of form components (e.g. input, select) for showing errors when present
 * @param children element(s) to wrap
 * @param className class to apply to this component
 * @param error message to display. undefined implies no error.
 * @param label label for form control
 * @constructor
 */
const FormControl: React.FunctionComponent<Props> = ({children, className, error, label}: Props) => (
    <div className={classNames(styles.container, {[styles.error]: error}, className)}>
        {label && <div className={styles.label}>{label}</div>}
        <div
            className={styles.body}
        >
            <div className={styles.form}>
                {children}
            </div>
            {error && <Tooltip title={error} className={styles.errorIcon} >
                <Icon type="close-circle" theme="filled" />
            </Tooltip>}
        </div>
    </div>
);

export default FormControl;

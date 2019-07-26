import { Icon, Tooltip } from "antd";
import * as classNames from "classnames";
import { ReactNode, ReactNodeArray } from "react";
import * as React from "react";

const styles = require("./styles.pcss");

interface Props {
    children?: ReactNode | ReactNodeArray;
    className?: string;
    error?: string;
    onClick?: () => void;
}

/**
 * Wrapper around any kind of form components (e.g. input, select) for showing errors when present
 * @param children element(s) to wrap
 * @param className class to apply to this component
 * @param error message to display. undefined implies no error.
 * @param onClick callback for when component is clicked
 * @constructor
 */
const FormControl: React.FunctionComponent<Props> = ({children, className, error, onClick}: Props) => (
    <div
        className={classNames(
            styles.container,
            {[styles.error]: error},
            className
        )}
        onClick={onClick}
    >
        <div className={styles.form}>
            {children}
        </div>
        {error && <Tooltip title={error} className={styles.errorIcon} >
            <Icon type="close-circle" theme="filled" />
        </Tooltip>}
    </div>
);

export default FormControl;

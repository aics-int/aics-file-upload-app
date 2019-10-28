import { JSSJobStatus } from "@aics/job-status-client/type-declarations/types";
import { Tooltip } from "antd";
import * as classNames from "classnames";
import * as React from "react";

const styles = require("./styles.pcss");

const IN_PROGRESS_CLASSNAME = "inProgress";
const SUCCESS_CLASSNAME = "success";
const ERROR_CLASSNAME = "error";
const STATUS_TO_CLASSNAME_MAP: {[status: string]: string} = Object.freeze({
    BLOCKED: IN_PROGRESS_CLASSNAME,
    FAILED: ERROR_CLASSNAME,
    RETRYING: IN_PROGRESS_CLASSNAME,
    SUCCEEDED: SUCCESS_CLASSNAME,
    UNRECOVERABLE: ERROR_CLASSNAME,
    WAITING: IN_PROGRESS_CLASSNAME,
    WORKING: IN_PROGRESS_CLASSNAME,
});

interface Props {
    className?: string;
    status: JSSJobStatus;
}

const StatusCircle: React.FunctionComponent<Props> = ({className, status}: Props) => (
    <Tooltip placement="right" title={status} className={className}>
        <div className={classNames(styles.statusCircle, styles[STATUS_TO_CLASSNAME_MAP[status]])}/>
    </Tooltip>
);

export default StatusCircle;
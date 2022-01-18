import classNames from "classnames";
import { ReactNode, ReactNodeArray } from "react";
import * as React from "react";

const styles = require("./styles.pcss");

interface Props {
  children: ReactNode | ReactNodeArray;
  className?: string;
  label: string;
}

/**
 * Adds a label to any kind of form control like a select or input
 * @param children a form control
 * @param className optional className to add to the component
 * @param label the label to display
 * @constructor
 */
const LabeledInput: React.FunctionComponent<Props> = ({
  children,
  className,
  label,
}: Props) => (
  <div className={classNames(styles.container, className)}>
    <div className={styles.label}>{label}</div>
    {children}
  </div>
);

export default LabeledInput;

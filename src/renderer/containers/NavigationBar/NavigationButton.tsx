import { Button } from "antd";
import classNames from "classnames";
import * as React from "react";

const styles = require("./styles.pcss");

interface Props {
  icon: (props: { className: string }) => React.ReactElement;
  isSelected: boolean;
  onSelect: () => void;
  title: string;
}

export default function NavigationButton(props: Props) {
  return (
    <Button
      className={classNames(
        styles.button,
        props.isSelected ? styles.selectedButton : undefined
      )}
      onClick={() => !props.isSelected && props.onSelect()}
    >
      {props.icon({ className: styles.buttonIcon })}
      <p className={styles.buttonTitle}>{props.title}</p>
    </Button>
  );
}

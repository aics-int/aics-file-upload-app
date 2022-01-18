import { CaretLeftOutlined, CaretRightOutlined, CheckOutlined } from "@ant-design/icons";
import { Button, Popover } from "antd";
import { isNil } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { setTutorialTooltipStep } from "../../state/feedback/actions";
import { getCurrentTutorialOrder } from "../../state/feedback/selectors";
import { updateSettings } from "../../state/setting/actions";
import { getShowUploadHint } from "../../state/setting/selectors";
import { TutorialStep } from "../../state/types";

const styles = require("./styles.pcss");

interface Props {
  children: React.ReactNode;
  disabled?: boolean;
  placement?: "left" | "right" | "top" | "bottom";
  message: string;
  step: TutorialStep;
  title: string;
}

/**
 * This container renders a tooltip over the given children to provide context to what usage
 * the children are meant to provide. The purpose of this is to serve as a sort of tutorial
 * to more discrete features. It uses the state to control whether any given instance
 * of this container's tooltip is meant to be visible, but can be disabled via props.
 */
export default function TutorialTooltip(props: Props) {
  const dispatch = useDispatch();
  const showUploadHint = useSelector(getShowUploadHint);
  const { previous, current, next } = useSelector(getCurrentTutorialOrder);

  const content = (
    <div className={styles.contentContainer}>
      <h4>Hint: {props.title}</h4>
      <p>{props.message}</p>
      <div className={styles.footer}>
        <div>
          <Button
            className={styles.footerButton}
            onClick={() => dispatch(updateSettings({ showUploadHint: false }))}
          >
            Disable upload hints
          </Button>
        </div>
        <div>
          <Button
            className={styles.footerButton}
            disabled={isNil(previous)}
            icon={<CaretLeftOutlined />}
            onClick={() => dispatch(setTutorialTooltipStep(previous))}
          />
          <Button
            className={styles.footerButton}
            icon={isNil(next) ? <CheckOutlined /> : <CaretRightOutlined />}
            onClick={() => dispatch(setTutorialTooltipStep(next))}
          />
        </div>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      overlayClassName={styles.popover}
      placement={props.placement}
      visible={current === props.step && !props.disabled && showUploadHint}
    >
      {props.children}
    </Popover>
  );
}

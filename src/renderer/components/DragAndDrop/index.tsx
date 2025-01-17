import classNames from "classnames";

import * as React from "react";
import { webUtils } from "electron";

import { UploadType } from "../../state/selection/types";

const styles = require("./styles.pcss");

interface DragAndDropProps {
  children?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  uploadType?: UploadType;
  onDrop: (files: string[]) => void;
}

const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
  // Not having this was causing issues when > 1 divs with onDrag were layered
  e.preventDefault();
};

/**
 * Component useful for making its child components a drag and drop area for which
 * onDrop events will be captured and send back up to the parent as a callback.
 */
export default function DragAndDrop(props: DragAndDropProps) {
  // Keeps track of net number of drag events into component.
  // Used to determine if the element is being hovered or not.
  // This is guaranteed to be 1 or greater when a file is hovered within this component.
  // Making this a boolean doesn't work because child elements will also fire
  // drag/drop events (and this can't be prevented).
  const [dragEnterCount, setDragEnterCount] = React.useState(0);

  const isHovered = dragEnterCount > 0;

  const onDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    // Ignore non-file drag events
    if (e.dataTransfer.items[0]?.kind === "file") {
      e.preventDefault();
      // Prevent drag and drop events from stacking (like notes over upload job page)
      e.stopPropagation();
      setDragEnterCount(dragEnterCount + 1);
    }
  };

  const onDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // Ignore non-file drag events
    if (e.dataTransfer.items[0]?.kind === "file") {
      e.preventDefault();
      // Prevent drag and drop events from stacking (like notes over upload job page)
      e.stopPropagation();
      // Ensure the drag enter count can never be negative since that would require
      // a file originating from the file upload app and moved elsewhere
      setDragEnterCount(dragEnterCount - 1 <= 0 ? 0 : dragEnterCount - 1);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    // Ignore empty drop events
    if (e.dataTransfer.files.length) {
      e.preventDefault();
      // Prevent drag and drop events from stacking (like notes over upload job page)
      e.stopPropagation();
      setDragEnterCount(0);
      props.onDrop(Array.from(e.dataTransfer.files, (f) => webUtils.getPathForFile(f)));
    }
  };

  if (props.disabled) {
    return (
      <div className={classNames(styles.childContainer, props.className)}>
        {props.children}
      </div>
    );
  }

  return (
    <div
      className={classNames(styles.container)}
      onDragEnter={onDragEnter}
      onDragLeave={onDragLeave}
      onDragEnd={onDragLeave}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      {props.children}
      <div className={isHovered ? styles.highlight : undefined} />
    </div>
  );
}

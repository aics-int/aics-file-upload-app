import { Select } from "antd";
import { castArray } from "lodash";
import React, { useState } from "react";

const styles = require("../defaultInputStyles.pcss");

interface Props {
  disableMultiSelect?: boolean;
  initialValue: string[];
  options: string[];
  commitChanges: (value: string[]) => void;
}

export default function DropdownEditor({
  disableMultiSelect,
  initialValue,
  options,
  commitChanges,
}: Props) {
  const [value, setValue] = useState<string[]>(initialValue);

  function handleCommit() {
    // May not be an array if multi-select is disabled
    commitChanges(castArray(value));
  }

  return (
    <Select
      autoFocus
      allowClear
      defaultOpen
      className={styles.defaultInput}
      mode={disableMultiSelect ? undefined : "multiple"}
      onBlur={handleCommit}
      onChange={(v: string[]) => setValue(v)}
      value={value}
    >
      {options.map((option: string) => (
        <Select.Option key={option}>{option}</Select.Option>
      ))}
    </Select>
  );
}

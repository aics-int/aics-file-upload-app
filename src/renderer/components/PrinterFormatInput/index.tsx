import { Input } from "antd";
import { isEmpty, isNumber, toNumber, uniq } from "lodash";
import * as React from "react";
import { defaultMemoize } from "reselect";

interface PrinterFormatInputProps {
  value?: string;
  className?: string;
  placeholder: string;
  onEnter: (value: string, errorMessage: string | undefined) => void;
}

/*
    This component contains tools for rendering and handling input meant to be support printer formatted values.
    What this means is input is restricted to contain only numbers, commas, whitespace, and dashes allowing the user
    to easily specify  ranges of values for numbers.
 */
class PrinterFormatInput extends React.Component<PrinterFormatInputProps, Record<string, any>> {
  public static validateInput = defaultMemoize(
    (input: string): string | undefined => {
      if (isEmpty(input)) {
        return undefined;
      }
      const positions = input.split(",").map((position) => position.trim());
      for (const [idx, position] of positions.entries()) {
        const positionIndex = `Position at index ${idx + 1}`;
        if (isEmpty(position)) {
          return `${positionIndex} is empty`;
        }
        const range = position.split("-");
        const numberRange = range
          .filter((num) => !isEmpty(num))
          .map((num) => toNumber(num));
        if (range.length !== numberRange.length) {
          return `${positionIndex} is not valid range`;
        }
        if (!isNumber(numberRange[0])) {
          return `${positionIndex} is not a number`;
        }
        if (numberRange.length > 1) {
          if (!isNumber(numberRange[1])) {
            return `${positionIndex} is not valid range`;
          }
          if (numberRange.length > 2) {
            return `${positionIndex} has multiple dashes in a row without a comma separator`;
          }
          if (numberRange[0] > numberRange[1]) {
            return `${positionIndex} has uneven range, right number should be greater than left`;
          }
        }
      }
      return undefined;
    }
  );

  public static extractValues = (input: string): number[] | undefined => {
    const values: number[] = [];
    if (!isEmpty(input)) {
      if (PrinterFormatInput.validateInput(input)) {
        return undefined;
      }
      input
        .split(",")
        .map((position) => position.trim())
        .forEach((position: string) => {
          const range = position.split("-").map((num) => toNumber(num));
          values.push(range[0]);
          if (range.length > 1) {
            for (let i = range[0] + 1; i <= range[1]; i += 1) {
              values.push(i);
            }
          }
        });
    }
    return uniq(values);
  };

  public render() {
    const { className, placeholder, value } = this.props;

    return (
      <Input
        allowClear={true}
        value={value}
        className={className}
        onChange={this.onChange}
        placeholder={placeholder}
      />
    );
  }

  // Remove anything that isn't a number, comma, whitespace, or dash
  private onChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.replace(/[^0-9,\-\s]/g, "");
    this.props.onEnter(value, PrinterFormatInput.validateInput(value));
  };
}

export default PrinterFormatInput;

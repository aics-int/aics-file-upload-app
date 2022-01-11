import { FilterFilled, FilterOutlined } from "@ant-design/icons";
import { Checkbox, DatePicker, Input, Popover } from "antd";
import { debounce, without } from "lodash";
import * as moment from "moment";
import * as React from "react";
import { FilterProps } from "react-table";

const styles = require("./styles.pcss");

export enum FilterType {
  DATE = "DATE",
  SELECTION = "SELECTION",
  TEXT = "TEXT",
}

interface Props {
  options?: string[];
  type: FilterType;
}

/**
 * Function that returns a different component to be used with a react-table
 * to enable filtering. The component returned is dependent on the type prop given.
 */
export default function Filter(props: Props) {
  return function FilterComponent<T extends Record<string, any>>(filterProps: FilterProps<T>) {
    let content: React.ReactNode;
    if (props.type === FilterType.DATE) {
      content = (
        <DatePicker
          value={moment(filterProps.column.filterValue)}
          onChange={(v) => filterProps.column.setFilter(v?.toDate())}
          placeholder={`Search by ${filterProps.column.id}`}
        />
      );
    } else if (props.type === FilterType.SELECTION) {
      content = (
        <div className={styles.selectionMenu}>
          {props.options?.map((option) => (
            <Checkbox
              key={option}
              checked={filterProps.column.filterValue?.includes(option)}
              onChange={(e) => {
                if (e.target.checked) {
                  filterProps.column.setFilter([
                    ...(filterProps.column.filterValue || []),
                    option,
                  ]);
                } else {
                  const columnsWithoutValue = without(
                    filterProps.column.filterValue,
                    option
                  );
                  filterProps.column.setFilter(
                    columnsWithoutValue.length ? columnsWithoutValue : undefined
                  );
                }
              }}
            >
              {option}
            </Checkbox>
          ))}
        </div>
      );
    } else {
      const onUpdate = debounce((value: string) => {
        filterProps.column.setFilter(value);
      });
      content = (
        <Input
          allowClear
          defaultValue={filterProps.column.filterValue}
          onChange={(e) => {
            e.persist();
            onUpdate(e.target.value);
          }}
          placeholder={`Search by ${filterProps.column.id}`}
        />
      );
    }

    return (
      <Popover content={content}>
        {filterProps.column.filterValue !== undefined ? 
          <FilterFilled
            className={styles.filter}
            title={`Filter by ${filterProps.column.id}`}
          />
          :
          <FilterOutlined
            className={styles.filter}
            title={`Filter by ${filterProps.column.id}`}
          />
        }
      </Popover>
    );
  };
}

import {
  UseExpandedHooks,
  UseExpandedInstanceProps,
  UseExpandedOptions,
  UseExpandedRowProps,
  UseExpandedState,
  UseGroupByCellProps,
  UseResizeColumnsColumnOptions,
  UseResizeColumnsColumnProps,
  UseResizeColumnsOptions,
  UseResizeColumnsState,
  UseRowSelectHooks,
  UseRowSelectInstanceProps,
  UseRowSelectOptions,
  UseRowSelectRowProps,
  UseRowSelectState,
  UseRowStateCellProps,
  UseSortByColumnOptions,
  UseSortByColumnProps,
  UseSortByHooks,
  UseSortByInstanceProps,
  UseSortByOptions,
  UseSortByState,
} from "react-table";

import { ColumnType } from "../services/labkey-client/types";

interface CustomColumnProps {
  // Custom props supplied in column definition
  description?: string;
  dropdownValues?: string[];
  isReadOnly?: boolean;
  isRequired?: boolean;
  hasSubmitBeenAttempted?: boolean;
  type?: ColumnType;
  lookupSchema?: string;
  lookupTable?: string;
}

// Config for `react-table` types. More info here:
// https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/react-table
declare module "react-table" {
  export interface TableOptions<D extends object>
    extends UseExpandedOptions<D>,
      UseResizeColumnsOptions<D>,
      UseRowSelectOptions<D>,
      UseFiltersOptions<D>,
      UseSortByOptions<D>,
      Record<string, any> {}

  export interface Hooks<D extends object = {}>
    extends UseExpandedHooks<D>,
      UseRowSelectHooks<D>,
      UseSortByHooks<D> {}

  export interface TableInstance<D extends object = {}>
    extends UseExpandedInstanceProps<D>,
      UseRowSelectInstanceProps<D>,
      UseFiltersInstanceProps<D>,
      UseSortByInstanceProps<D> {}

  export interface TableState<D extends object = {}>
    extends UseExpandedState<D>,
      UseResizeColumnsState<D>,
      UseRowSelectState<D>,
      UseFiltersState<D>,
      UseSortByState<D> {}

  export interface ColumnInterface<D extends object = {}>
    extends UseResizeColumnsColumnOptions<D>,
      UseSortByColumnOptions<D>,
      UseFiltersColumnOptions<D>,
      CustomColumnProps {}

  export interface ColumnInstance<D extends object = {}>
    extends UseResizeColumnsColumnProps<D>,
      UseSortByColumnProps<D>,
      UseFiltersColumnProps<D>,
      CustomColumnProps {}

  export interface Cell<D extends object = {}, V = any>
    extends UseGroupByCellProps<D>,
      UseRowStateCellProps<D> {}

  export interface HeaderGroup<D extends object = {}>
    extends UseSortByColumnProps<D>,
      UseFiltersColumnProps<D> {}

  export interface Row<D extends object = {}>
    extends UseExpandedRowProps<D>,
      UseRowSelectRowProps<D> {}
}

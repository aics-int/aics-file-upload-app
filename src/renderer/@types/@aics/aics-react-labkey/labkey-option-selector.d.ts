// todo lisah 11/15/18 DT-51 create npm module so this can be shared
declare module "@aics/aics-react-labkey" {
  export interface LabkeyOptionSelectorCommonProps<T> {
    autoFocus?: boolean;
    id?: string;
    label: string;
    optionIdKey: string;
    optionNameKey?: string;
    selected?: T | T[];
    onOptionSelection: (option: T | null) => void;
    error?: boolean;
    multiSelect?: boolean;
    placeholder?: string;
    helpText?: string;
    style?: any; // style can have a lot of different attributes; and we don't need to validate them all
    required?: boolean;
  }

  // Default mode props
  export interface LabkeyOptionSelectorDefaultProps<T>
    extends LabkeyOptionSelectorCommonProps<T> {
    options: T[];
  }

  // Async mode props
  export interface LabkeyOptionSelectorAsyncProps<T>
    extends LabkeyOptionSelectorCommonProps<T> {
    async: boolean;
    loadOptions: (input: string) => Promise<{ options: T[] } | null>;
  }

  // Creatable mode props
  export interface LabkeyOptionSelectorCreateProps<T>
    extends LabkeyOptionSelectorCommonProps<T> {
    creatable: boolean;
  }

  type LabkeyOptionSelectorProps<T> =
    | LabkeyOptionSelectorDefaultProps<T>
    | LabkeyOptionSelectorAsyncProps<T>
    | LabkeyOptionSelectorCreateProps<T>;

  export class LabKeyOptionSelector<T> extends React.Component<
    LabkeyOptionSelectorProps<T>,
    Record<string, any>
  > {
    constructor(props: LabkeyOptionSelectorProps<T>);
    public render(): JSX.Element | null;
  }
}

import { Icon, Select, Spin } from "antd";
import * as classNames from "classnames";
import { ReactNode } from "react";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator, AnyAction } from "redux";

import { getRequestsInProgressContains } from "../../state/feedback/selectors";
import {
  clearOptionsForLookup,
  retrieveOptionsForLookup,
} from "../../state/metadata/actions";
import { getMetadata } from "../../state/metadata/selectors";
import {
  ClearOptionsForLookupAction,
  GetOptionsForLookupAction,
} from "../../state/metadata/types";
import { AsyncRequest, MetadataStateBranch, State } from "../../state/types";

const styles = require("./styles.pcss");

interface StateProps {
  isLargeLookup: boolean;
  options?: any[];
  optionsLoading: boolean;
}

interface OwnProps {
  className?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  getDisplayFromOption?: (option: any) => string;
  lookupAnnotationName: keyof MetadataStateBranch;
  onBlur?: () => void;
  placeholder?: string;
}

interface DefaultModeProps {
  mode?: "default";
  selectSearchValue: (value?: string) => void;
  value?: string;
}

interface MultipleModeProps {
  mode: "multiple";
  selectSearchValue: (value: string[]) => void;
  value: string[];
}

// props passed from parent that override State or Dispatch props
interface OwnPropsOverrides {
  clearOptionsOverride?: (() => void) | ActionCreator<AnyAction>;
  optionsOverride?: any[];
  optionsLoadingOverride?: boolean;
  retrieveOptionsOverride?:
    | ((input?: string) => void)
    | ActionCreator<AnyAction>;
}

interface DispatchProps {
  clearOptions: ActionCreator<ClearOptionsForLookupAction>;
  retrieveOptions: ActionCreator<GetOptionsForLookupAction>;
}

type Props = StateProps &
  OwnProps &
  OwnPropsOverrides &
  DispatchProps &
  (DefaultModeProps | MultipleModeProps);

/**
 * This component is a dropdown for labkey tables that are considered to be "Lookups".
 * The dropdown values are automatically loaded if it does not come from a large lookup table (see LARGE_LOOKUPS below).
 * Otherwise, the user will need to provide a search value to get dropdown options.
 */
class LookupSearch extends React.Component<Props, { searchValue?: string }> {
  public constructor(props: Props) {
    super(props);
    this.state = {
      searchValue: undefined,
    };
  }

  public componentDidMount(): void {
    const { isLargeLookup } = this.props;
    if (!isLargeLookup) {
      this.retrieveOptions();
    }
  }

  public render() {
    const {
      className,
      defaultOpen,
      disabled,
      isLargeLookup,
      lookupAnnotationName,
      mode,
      onBlur,
      options,
      optionsLoading,
      placeholder,
      selectSearchValue,
      value,
    } = this.props;

    let notFoundContent: ReactNode = "No Results Found";
    if (optionsLoading) {
      notFoundContent = <Spin size="large" />;
    } else if (isLargeLookup && !this.state.searchValue) {
      notFoundContent = `Start typing to search for a ${lookupAnnotationName}`;
    }

    return (
      <Select
        allowClear={true}
        className={classNames(
          styles.container,
          { [styles.search]: isLargeLookup },
          className
        )}
        defaultActiveFirstOption={false}
        defaultOpen={defaultOpen}
        disabled={disabled}
        loading={optionsLoading}
        mode={mode}
        notFoundContent={notFoundContent}
        onBlur={onBlur}
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore: lisah cannot seem to make this component happy even
        // if I extend its props in this component rather than overriding value and onChange
        // The issue is related to wanting to support a generic value that can be a string or string[]
        // and wanting onChange to take in either a string or string[]. I think this is called
        // "type narrowing in discriminated unions":
        // https://stackoverflow.com/questions/50870423/discriminated-union-of-generic-type
        onChange={selectSearchValue}
        onSearch={this.onSearch}
        placeholder={placeholder}
        showSearch={true}
        suffixIcon={isLargeLookup ? <Icon type="search" /> : undefined}
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        value={value}
      >
        {(options || []).map((option) => {
          const display = this.getDisplayFromOption(option);
          return (
            <Select.Option key={display} value={display}>
              {display}
            </Select.Option>
          );
        })}
      </Select>
    );
  }

  private onSearch = (searchValue?: string): void => {
    this.setState({ searchValue });
    if (searchValue) {
      this.retrieveOptions(searchValue);
    } else {
      this.clearOptions();
    }
  };

  private getDisplayFromOption = (option: any): string => {
    const { getDisplayFromOption } = this.props;
    if (getDisplayFromOption) {
      return getDisplayFromOption(option);
    }
    return option;
  };

  private retrieveOptions = (searchValue?: string): void => {
    if (this.props.retrieveOptionsOverride) {
      this.props.retrieveOptionsOverride(searchValue);
    } else {
      this.props.retrieveOptions(this.props.lookupAnnotationName, searchValue);
    }
  };

  private clearOptions = () => {
    if (this.props.clearOptionsOverride) {
      this.props.clearOptionsOverride();
    } else {
      const { lookupAnnotationName } = this.props;
      this.props.clearOptions(lookupAnnotationName);
    }
  };
}

const LARGE_LOOKUPS: readonly string[] = Object.freeze(["vial"]);
function mapStateToProps(
  state: State,
  {
    className,
    clearOptionsOverride,
    defaultOpen,
    disabled,
    lookupAnnotationName,
    optionsOverride,
    optionsLoadingOverride,
    placeholder,
    retrieveOptionsOverride,
  }: OwnProps & OwnPropsOverrides
) {
  return {
    className,
    clearOptionsOverride,
    defaultOpen,
    disabled,
    isLargeLookup: LARGE_LOOKUPS.includes(
      `${lookupAnnotationName}`.toLowerCase()
    ),
    lookupAnnotationName,
    options: optionsOverride || getMetadata(state)[lookupAnnotationName],
    optionsLoading:
      optionsLoadingOverride ||
      getRequestsInProgressContains(state, AsyncRequest.GET_OPTIONS_FOR_LOOKUP),
    placeholder,
    retrieveOptionsOverride,
  };
}

const dispatchToPropsMap = {
  clearOptions: clearOptionsForLookup,
  retrieveOptions: retrieveOptionsForLookup,
};

export default connect(mapStateToProps, dispatchToPropsMap)(LookupSearch);

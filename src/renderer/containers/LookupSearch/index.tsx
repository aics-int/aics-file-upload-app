import { SearchOutlined } from "@ant-design/icons";
import { Form, Select, Spin } from "antd";
import classNames from "classnames";
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
  autoFocus?: boolean;
  className?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  dropdownRender?: (n: React.ReactElement) => React.ReactElement;
  error?: boolean;
  getDisplayFromOption?: (option: any) => string;
  lookupAnnotationName: keyof MetadataStateBranch;
  lookupTable?: string;
  onBlur?: () => void;
  placeholder?: string;
}

interface DefaultModeProps {
  mode?: "tags";
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

    let notFoundContent: React.ReactNode = "No Results";
    if (optionsLoading) {
      notFoundContent = <Spin size="large" />;
    } else if (isLargeLookup && !this.state.searchValue) {
      notFoundContent = `Start typing to search for a ${lookupAnnotationName}`;
    }

    return (
      <Form.Item
        className={styles.form}
        validateStatus={this.props.error ? "error" : ""}
      >
        <Select
          autoFocus={this.props.autoFocus}
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
          dropdownRender={this.props.dropdownRender}
          notFoundContent={notFoundContent}
          onBlur={onBlur}
          // Unable to type this variable most explicitly due to "type narrowing in discriminated unions"
          // typing as any for now though actual value will either be a string or string[]
          // https://stackoverflow.com/questions/50870423/discriminated-union-of-generic-type
          onChange={(v: any) => selectSearchValue(v)}
          onSearch={this.onSearch}
          placeholder={placeholder}
          showSearch={true}
          suffixIcon={isLargeLookup ? <SearchOutlined /> : undefined}
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
      </Form.Item>
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

const LARGE_LOOKUPS: readonly string[] = Object.freeze(["vial", "file"]);
function mapStateToProps(
  state: State,
  {
    className,
    clearOptionsOverride,
    defaultOpen,
    disabled,
    lookupAnnotationName,
    lookupTable,
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
    isLargeLookup: LARGE_LOOKUPS.includes(`${lookupTable}`.toLowerCase()),
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

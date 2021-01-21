import { Input } from "antd";
import * as React from "react";
import { editors } from "react-data-grid";

import { Duration } from "../../../state/types";

const styles = require("./styles.pcss");

interface Props extends AdazzleReactDataGrid.EditorBaseProps {
  value: Duration[];
}

interface DurationState {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

// This component provides a way to edit duration information. It is used as a
// custom editor with React Data Grid, and therefore must implement `getValue`
// and `getInputNode`. Our version of React Data Grid does not seem to be
// compatible with function components for custom editors, so a class component
// is used here.
// https://adazzle.github.io/react-data-grid/docs/examples/custom-editors
export default class DurationEditor extends editors.EditorBase<
  Props,
  DurationState
> {
  private editorRef = React.createRef<HTMLDivElement>();

  public constructor(props: Props) {
    super(props);

    if (props.value.length === 1) {
      const initialDuration = props.value[0];
      this.state = {
        days: initialDuration.days.toString(),
        hours: initialDuration.hours.toString(),
        minutes: initialDuration.minutes.toString(),
        seconds: initialDuration.seconds.toString(),
      };
    } else {
      this.state = {
        days: "0",
        hours: "0",
        minutes: "0",
        seconds: "0",
      };
    }
  }

  // For better or worse, we currently expect annotation values to always be
  // stored in arrays. Therefore, that's what we return here.
  public getValue = (): { [key: string]: Duration[] } => {
    const { days, hours, minutes, seconds } = this.state;
    const durationValue: Duration = {
      days: Number(days),
      hours: Number(hours),
      minutes: Number(minutes),
      seconds: Number(seconds),
    };

    // Return duration object if any key has a value greater than 0
    if (Object.values(durationValue).some((val) => val > 0)) {
      return { [this.props.column.key]: [durationValue] };
    }

    return { [this.props.column.key]: [] };
  };

  public getInputNode = () => this.editorRef.current;

  public render() {
    return (
      <div ref={this.editorRef}>
        <Input.Group compact className={styles.durationEditorContainer}>
          <Input
            value={this.state.days}
            onChange={(e) => this.setState({ days: e.target.value })}
            addonAfter="D"
            style={{ width: "25%" }}
          />
          <Input
            value={this.state.hours}
            onChange={(e) => this.setState({ hours: e.target.value })}
            addonAfter="H"
            style={{ width: "25%" }}
          />
          <Input
            value={this.state.minutes}
            onChange={(e) => this.setState({ minutes: e.target.value })}
            addonAfter="M"
            style={{ width: "25%" }}
          />
          <Input
            value={this.state.seconds}
            onChange={(e) => this.setState({ seconds: e.target.value })}
            addonAfter="S"
            style={{ width: "25%" }}
          />
        </Input.Group>
      </div>
    );
  }
}

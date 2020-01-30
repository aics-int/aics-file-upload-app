import { Popover } from "antd";
import * as React from "react";
import { editors } from "react-data-grid";

import WellEditorPopover from "../../../containers/WellEditorPopover";

const styles = require("./styles.pcss");

interface EditorColumn extends AdazzleReactDataGrid.ExcelColumn {
    selectedWellLabels?: string;
}

interface EditorProps extends AdazzleReactDataGrid.EditorBaseProps {
    column: EditorColumn;
    width?: string;
}

class WellsEditor extends editors.EditorBase<EditorProps, {}> {
    // This ref is here so that the DataGrid doesn't throw a fit, normally it would use this to .focus() the input
    public input = React.createRef<HTMLDivElement>();

    public render() {
        const {
            column: {
                selectedWellLabels,
            },
            rowData: {
                file,
                positionIndex,
            },
        } = this.props;

        return (
            <div ref={this.input}>
                <Popover
                    placement="bottom"
                    visible={true}
                    content={(
                        <WellEditorPopover
                            file={file}
                            positionIndex={positionIndex}
                        />
                    )}
                    title="Associate Wells with this row by selecting wells and clicking Associate"
                >
                    <div className={styles.labels}>{selectedWellLabels}</div>
                </Popover>
            </div>
        );
    }

    // Should return an object of key/value pairs to be merged back to the row
    public getValue = () => {
        return { [this.props.column.key]: this.props.value };
    }

    public getInputNode = (): Element | Text | null => {
        return this.input.current;
    }
}

export default WellsEditor;

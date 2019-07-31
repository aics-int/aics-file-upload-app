import { Alert, Button, Modal } from "antd";
import TextArea from "antd/lib/input/TextArea";
import { remote } from "electron";
import { writeFile } from "fs";
import { isEmpty, uniqBy, without } from "lodash";
import * as React from "react";
import { ChangeEvent } from "react";
import ReactDataGrid from "react-data-grid";

import { ColumnType, SchemaDefinition } from "../../state/setting/types";
import CheckboxEditor from "../CheckboxEditor";
import FormControl from "../FormControl";
import ColumnTypeEditor from "./ColumnTypeEditor";
import ColumnTypeFormatter from "./ColumnTypeFormatter";
import GridRowsUpdatedEvent = AdazzleReactDataGrid.GridRowsUpdatedEvent;
import ErrnoException = NodeJS.ErrnoException;

const DEFAULT_COLUMN = Object.freeze({
    label: "",
    required: false,
    type: {
        type: ColumnType.TEXT,
    },
});
const styles = require("./styles.pcss");

export const COLUMN_TYPE_DISPLAY_MAP: {[id in ColumnType]: string} = {
  [ColumnType.TEXT]: "Text",
  [ColumnType.DROPDOWN]: "Dropdown",
  [ColumnType.BOOLEAN]: "Yes/No",
  [ColumnType.DATETIME]: "Date and Time",
  [ColumnType.DATE]: "Date",
  [ColumnType.NUMBER]: "Number",
};

const SCHEMA_EDITOR_COLUMNS = [
    {
        editable: true,
        formatter: ({value}: {value: string}) => {
            return (
                <FormControl
                    error={value ? undefined : "This field is required"}
                >
                    {value}
                </FormControl>
            );
        },
        key: "label",
        name: "Column Name",
        resizable: true,
        width: 300,
    },
    {
        editable: true,
        // @ts-ignore
        editor: <ColumnTypeEditor/>,
        formatter: <ColumnTypeFormatter/>,
        key: "type",
        name: "Data Type",
    },
    {
        editable: true,
        // @ts-ignore
        editor: <CheckboxEditor propName="required"/>,
        formatter: ({ value }: any) => <div>{value ? "True" : "False"}</div>,
        key: "required",
        name: "Required?",
        width: 100,
    },
];

interface Props {
    className?: string;
    close: () => void;
    schema?: SchemaDefinition;
    visible: boolean;
}

interface ColumnDefinitionDraft {
    label?: string;
    type: {
        type: ColumnType,
        dropdownValues?: string[]; // only applicable if ColumnType is a dropdown
    };
    required?: boolean;
}

interface SchemaEditorModalState {
    columns: ColumnDefinitionDraft[];
    notes?: string;
    selectedRows: number[];
    isEditing: boolean[];
}

class SchemaEditorModal extends React.Component<Props, SchemaEditorModalState> {
    constructor(props: Props) {
        super(props);

        this.state = this.getInitialState(props.schema);
    }

    public componentDidUpdate(prevProps: Props): void {
        if (prevProps.schema !== this.props.schema) {
            this.setState(this.getInitialState(this.props.schema));
        }
    }

    public render() {
        const {
            className,
            close,
            schema,
            visible,
        } = this.props;
        const { columns, notes, selectedRows } = this.state;
        const duplicateNamesFound = this.duplicateNamesFound();
        const canSave = this.canSave();
        return (
            <Modal
                width="90%"
                className={className}
                title={schema ? "Edit Schema" : "New Schema"}
                visible={visible}
                onOk={this.saveAndClose}
                onCancel={close}
                okText="Save"
                okButtonProps={{
                    disabled: !canSave,
                }}
                maskClosable={false}
                afterClose={this.afterClose}
            >
                {duplicateNamesFound &&
                <Alert
                    className={styles.alert}
                    message="Columns with the same name found"
                    type="error"
                    showIcon={true}
                />}
                <div className={styles.columnDefinitionForm}>
                    <div className={styles.gridAndNotes}>
                        <ReactDataGrid
                            columns={SCHEMA_EDITOR_COLUMNS}
                            rowGetter={this.getRow}
                            rowsCount={columns.length}
                            cellNavigationMode="changeRow"
                            enableCellSelect={true}
                            onGridRowsUpdated={this.updateGridRow}
                            rowSelection={{
                                enableShiftSelect: true,
                                onRowsDeselected: this.deselectRows,
                                onRowsSelected: this.selectRows,
                                selectBy: {
                                    indexes: selectedRows,
                                },
                            }}
                        />
                        <TextArea
                            className={styles.notes}
                            rows={4}
                            placeholder="Notes for your team"
                            onChange={this.setNotes}
                            value={notes}
                        />
                    </div>
                    <div className={styles.buttons}>
                        <Button icon="plus" onClick={this.addColumn}/>
                        <Button icon="minus" onClick={this.removeColumns} disabled={isEmpty(selectedRows)}/>
                    </div>
                </div>
            </Modal>
        );
    }

    private getRow = (i: number) => {
        return this.state.columns[i];
    }

    private getInitialState = (schema?: SchemaDefinition): SchemaEditorModalState => {
        const columns: ColumnDefinitionDraft[] = schema ? schema.columns : [DEFAULT_COLUMN];

        return {
            columns,
            isEditing: columns.map(() => false),
            notes: schema ? schema.notes : undefined,
            selectedRows: [],
        };
    }

    private canSave = (): boolean => {
        const { columns } = this.state;
        const duplicateNamesFound: boolean = this.duplicateNamesFound();
        const columnWithNoLabelFound: boolean = !!columns.find(({label}) => !label);
        const dropdownValuesMissing: boolean = !!columns
            .find(({type}) => type.type === ColumnType.DROPDOWN && isEmpty(type.dropdownValues));

        return !duplicateNamesFound && !columnWithNoLabelFound && !dropdownValuesMissing;
    }

    private duplicateNamesFound = (): boolean => {
        let { columns } = this.state;
        columns = columns.filter((c) => !!c.label);
        return uniqBy(columns, "label").length !== columns.length;
    }

    private saveAndClose = () => {
        const schemaJson = JSON.stringify(
            {
                columns: this.state.columns.filter((c) => !!c && c.label && c.type),
                notes: this.state.notes,
            }
        );

        remote.dialog.showSaveDialog({
            filters: [
                {name: "JSON", extensions: ["json"]},
            ],
            title: "Save Schema",
        }, (filename?: string) => {
            if (filename) {
                if (!filename.endsWith(".json")) {
                    filename = `${filename}.json`;
                }
                writeFile(filename, schemaJson, (err: ErrnoException | null) => {
                    if (err) {
                        remote.dialog.showErrorBox("Error", err.message);
                    } else {
                        this.props.close();
                    }
                });
            }
        });
    }

    private setNotes = (e: ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({notes: e.target.value});
    }

    private afterClose = () => {
        this.setState(this.getInitialState());
    }

    private updateGridRow = (e: GridRowsUpdatedEvent<ColumnDefinitionDraft>) => {
        const { fromRow, toRow, updated } = e;
        const columns = [...this.state.columns];
        for (let i = fromRow; i <= toRow; i++) {
            columns[i] = {
                ...columns[i],
                ...updated,
            };
        }
        this.setState({columns});
    }

    private addColumn = () => {
        const columns = [...this.state.columns];
        columns.push({
            ...DEFAULT_COLUMN,
        });
        this.setState({columns});
    }

    private removeColumns = () => {
        const { selectedRows } = this.state;
        const columns = [...this.state.columns];
        selectedRows.forEach((row) => {
            columns.splice(row, 1);
        });
        this.setState({ columns, selectedRows: [] });
    }

    private selectRows = (rows: Array<{rowIdx: number}>) => {
        const indexes = rows.map((r) => r.rowIdx);
        this.setState({selectedRows: [...this.state.selectedRows, ...indexes]});
    }

    private deselectRows = (rows: Array<{rowIdx: number}>) => {
        const indexes = rows.map((r) => r.rowIdx);
        const selectedRows = without(this.state.selectedRows, ...indexes);
        this.setState({selectedRows});
    }
}

export default SchemaEditorModal;

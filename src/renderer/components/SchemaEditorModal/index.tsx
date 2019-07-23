import { Button, Modal } from "antd";
import { CheckboxChangeEvent } from "antd/lib/checkbox";
import TextArea from "antd/lib/input/TextArea";
import * as classNames from "classnames";
import { findIndex, includes, isEmpty, set } from "lodash";
import { ChangeEvent } from "react";
import * as React from "react";
import { ActionCreator } from "redux";
import { ColumnType, CreateSchemaAction, SchemaDefinition } from "../../state/setting/types";
import ColumnDefinitionForm from "./ColumnDefinitionForm";
import EmptyColumnDefinitionRow from "./EmptyColumnDefinitionRow";

const DEFAULT_COLUMN = Object.freeze({
    label: undefined,
    required: true,
    type: ColumnType.TEXT,
});
const styles = require("./styles.pcss");

interface Props {
    className?: string;
    createSchema: ActionCreator<CreateSchemaAction>;
    close: () => void;
    schema?: SchemaDefinition;
    visible: boolean;
}

interface ColumnDefinitionDraft {
    label?: string;
    type?: ColumnType;
    required?: boolean;
}

interface SchemaEditorModalState {
    columns: Array<ColumnDefinitionDraft | null>;
    notes?: string;
    selectedRows: number[];
    isEditing: boolean[];
}

class SchemaEditorModal extends React.Component<Props, SchemaEditorModalState> {
    constructor(props: Props) {
        super(props);

        const columns: Array<ColumnDefinitionDraft | null> = props.schema ? props.schema.columns : [];
        for (let i = columns.length; i < 5; i++) {
            columns.push(null);
        }

        this.state = {
            columns,
            isEditing: columns.map(() => false),
            selectedRows: [],
        };
    }

    public render() {
        const {
            className,
            close,
            schema,
            visible,
        } = this.props;
        const { columns, isEditing, notes, selectedRows } = this.state;
        const columnNames = columns
            .filter((c) => c !== null)
            .map((c) => c ? c.label : "") as string[];
        return (
            <Modal
                width="90%"
                className={className}
                title={schema ? "Edit Schema" : "New Schema"}
                visible={visible}
                onOk={this.saveAndClose}
                onCancel={close}
            >
                <div className={styles.columnDefinitionForm}>
                    <div className={styles.gridAndNotes}>
                        <div className={styles.grid}>
                            <div className={styles.columnHeaders}>
                                <div className={classNames(styles.header, styles.orderColumn)}/>
                                <div className={classNames(styles.header, styles.labelColumn)}>
                                    Column Name
                                </div>
                                <div className={classNames(styles.header, styles.typeColumn)}>
                                    Data Type
                                </div>
                                <div className={classNames(styles.header, styles.requiredColumn)}>
                                    Required?
                                </div>
                            </div>
                            {columns.map((column, i) => {
                                return (
                                    <div
                                        className={classNames(styles.row,
                                            {[styles.selected]: includes(selectedRows, i)})}
                                        key={column && column.label ? column.label + i : i}
                                        onClick={this.selectRow(i)}
                                    >
                                        <div className={classNames(styles.orderColumn, styles.orderNumber)}>
                                            {column ? i + 1 : ""}
                                        </div>
                                        {column && <ColumnDefinitionForm
                                            columnNames={columnNames}
                                            className={classNames(styles.columnRow)}
                                            setIsEditing={this.setIsEditing(i)}
                                            setColumnLabel={this.setLabel(i)}
                                            setColumnType={this.setType(i)}
                                            setRequired={this.setRequired(i)}
                                            columnType={column.type}
                                            columnLabel={column.label}
                                            isEditing={isEditing[i]}
                                            required={column.required || false}
                                        />}
                                        {!column && <EmptyColumnDefinitionRow key={i} className={styles.columnRow}/>}
                                    </div>
                                );
                            })}
                        </div>
                        <TextArea
                            rows={4}
                            placeholder="Notes for your team"
                            onBlur={this.setNotes}
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

    private setIsEditing = (index: number) => {
        return (editing: boolean) => {
            const isEditing = [...this.state.isEditing];
            isEditing[index] = editing;
            this.setState({isEditing});
        };
    }

    private selectRow = (index: number) => {
        // todo: Select multiple if CTRL or SHIFT held down
        return () => this.setState({selectedRows: [index]});
    }

    private saveAndClose = () => {
        // this.props.createSchema(this.state.draft);
        this.props.close();
    }

    private setType = (i: number) => {
        return (type: ColumnType) => {
            const columns = [...this.state.columns];
            set(columns, `[${i}].type`, type);
            this.setState({columns});
        };
    }

    private setLabel = (i: number) => {
        return (label?: string) => {
            const columns = [...this.state.columns];
            columns[i] = {
                ...columns[i],
                label,
            };
            this.setState({columns});
        };
    }

    private setRequired = (i: number) => {
        return (e: CheckboxChangeEvent) => {
            const columns = [...this.state.columns];
            columns[i] = {
                ...columns[i],
                required: e.target.value,
            };
            this.setState({columns});
        };
    }

    private setNotes = (e: ChangeEvent<HTMLTextAreaElement>) => {
        this.setState({notes: e.target.value});
    }

    private addColumn = () => {
        const columns = [...this.state.columns];

        // first look for empty column definition forms
        const firstEmptyColumnDefinition = findIndex(columns, (col) => col !== null && !col.label);

        if (firstEmptyColumnDefinition > -1) {
            // focus column name input
            const isEditing = [...this.state.isEditing];
            isEditing[firstEmptyColumnDefinition] = true;
            this.setState({isEditing, selectedRows: []});

        } else {
            // find first empty row and convert that to a column definition form or else append a form to the end
            // of the list.
            const firstNullIndex = findIndex(columns, (col) => col === null);
            const isEditing = [...this.state.isEditing];
            if (firstNullIndex < 0) {
                columns.push(DEFAULT_COLUMN);
                isEditing.push(true);
            } else {
                columns[firstNullIndex] = DEFAULT_COLUMN;
                isEditing[firstNullIndex] = true;
            }
            this.setState({
                columns,
                isEditing,
                selectedRows: [],
            });
        }
    }

    private removeColumns = () => {
        const { selectedRows } = this.state;
        const columns = [...this.state.columns];
        selectedRows.forEach((row) => {
            columns.splice(row, 1);
        });
        this.setState({ columns });
    }
}

export default SchemaEditorModal;

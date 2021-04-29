import { Input, Modal, Select } from "antd";
import { trim } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import FormControl from "../../../components/FormControl";
import { ColumnType } from "../../../services/labkey-client/types";
import {
  getAnnotations,
  getAnnotationTypes,
  getLookups,
} from "../../../state/metadata/selectors";
import { createAnnotation } from "../../../state/template/actions";

const { TextArea } = Input;

const styles = require("./styles.pcss");

interface Props {
  visible: boolean;
  onClose: () => void;
}

/**
 * This modal is for creating new annotations. A user can use
 * this form to create novel annotations of various types that
 * can then be used in their template.
 */
function CreateAnnotationModal(props: Props) {
  const dispatch = useDispatch();
  const lookups = useSelector(getLookups);
  const annotations = useSelector(getAnnotations);
  const annotationTypes = useSelector(getAnnotationTypes);

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [showErrors, setShowErrors] = React.useState(false);
  const [lookupTable, setLookupTable] = React.useState<string>();
  const [annotationType, setAnnotationType] = React.useState<string>();
  const [dropdownOptions, setDropdownOptions] = React.useState<string[]>([]);

  const isDropdown = annotationType === ColumnType.DROPDOWN;
  const isLookup = !isDropdown && annotationType === ColumnType.LOOKUP;
  const isUniqueName = !annotations.find(
    (a) => a.name.toLowerCase() === name.toLowerCase()
  );

  function onSave() {
    const lookup = lookups.find((l) => l.tableName === lookupTable);
    const type = annotationTypes.find((at) => at.name === annotationType);
    if (
      name &&
      type &&
      description &&
      (!isDropdown || dropdownOptions.length) &&
      (!isLookup || lookup) &&
      isUniqueName
    ) {
      dispatch(
        createAnnotation({
          name,
          annotationTypeId: type.annotationTypeId,
          description,
          annotationOptions: dropdownOptions,
          lookupSchema: lookup?.schemaName,
          lookupTable: lookup?.tableName,
          lookupColumn: lookup?.columnName,
        })
      );
      props.onClose();
    } else if (!showErrors) {
      setShowErrors(true);
    }
  }

  return (
    <Modal
      destroyOnClose // Unmount child components
      width="90%"
      title="New Annotation"
      visible={props.visible}
      onOk={onSave}
      onCancel={props.onClose}
      okText="Save"
      maskClosable={false}
    >
      <p className={styles.subTitle}>
        Create a new annotation below. After making adjustments, click
        &quotSave&quot to successfully create the annotation.
      </p>
      <FormControl
        className={styles.formControl}
        label="Annotation Name"
        error={
          showErrors && (!trim(name) || !isUniqueName)
            ? "Annotation Name must be present and unique"
            : undefined
        }
      >
        <Input
          value={name}
          placeholder="Enter new annotation name here"
          onChange={(e) => setName(e.target.value)}
        />
      </FormControl>
      <FormControl
        className={styles.formControl}
        label="Description"
        error={
          showErrors && !trim(description)
            ? "Annotation Description is required"
            : undefined
        }
      >
        <TextArea
          value={description}
          placeholder="Enter new annotation description here"
          onChange={(e) => setDescription(e.target.value)}
        />
      </FormControl>
      <FormControl
        className={styles.formControl}
        label="Data Type"
        error={
          showErrors && !annotationType
            ? "Annotation Data Type is required"
            : undefined
        }
      >
        <Select
          className={styles.select}
          onSelect={(v: string) => setAnnotationType(v)}
          placeholder="Select annotation data type"
          value={annotationType}
        >
          {annotationTypes.map((type) => (
            <Select.Option key={type.name}>{type.name}</Select.Option>
          ))}
        </Select>
      </FormControl>
      {isDropdown && (
        <FormControl
          className={styles.formControl}
          label="Dropdown Options"
          error={
            showErrors && !dropdownOptions.length
              ? "Dropdown Options are required"
              : undefined
          }
        >
          <Select
            mode="tags"
            className={styles.select}
            value={dropdownOptions}
            placeholder="Enter dropdown options"
            onChange={(v: string[]) => setDropdownOptions(v)}
          />
        </FormControl>
      )}
      {isLookup && (
        <FormControl
          className={styles.formControl}
          label="Lookup Reference"
          error={
            showErrors && !lookupTable
              ? "Annotation Lookup Reference is required"
              : undefined
          }
        >
          <Select
            className={styles.select}
            onSelect={(v: string) => setLookupTable(v)}
            placeholder="Select Lookup"
            showSearch={true}
            value={lookupTable}
          >
            {lookups
              .sort((a, b) => a.tableName.localeCompare(b.tableName))
              .map(({ tableName }) => (
                <Select.Option key={tableName}>{tableName}</Select.Option>
              ))}
          </Select>
        </FormControl>
      )}
    </Modal>
  );
}

// Create a new instance of the modal whenever visiblity is toggled rather
// than update the existing one to avoid deriving state hooks based on
// visibility
export default function CreateAnnotationModalWrapper(props: Props) {
  return <CreateAnnotationModal key={`${props.visible}`} {...props} />;
}
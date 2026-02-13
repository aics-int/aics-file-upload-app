import { Button, Modal, Spin, Table } from "antd";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps } from "react-table";

import { fetchMetadataRequest } from "../../../../state/metadataExtraction/actions";
import { getMetadataForFile } from "../../../../state/metadataExtraction/selectors";
import { State } from "../../../../state/types";

const styles = require("./styles.pcss");

export default function SeeMetadataCell(props: CellProps<any>) {
  const dispatch = useDispatch();
  const filePath = (props.cell.row.original as any).file;

  // modal visibility
  const [isModalVisible, setIsModalVisible] = React.useState(false);

  const metadataState = useSelector((state: State) =>
    getMetadataForFile(state, filePath)
  );

  const showMetadata = () => {
    setIsModalVisible(true);
    // dispatch action to fetch metadata
    dispatch(fetchMetadataRequest(filePath));
  };

  const handleCancel = () => {
    // close modal
    setIsModalVisible(false);
  };

  return (
    <>
      <Button onClick={showMetadata} className={styles.seeMetadataButton}>
        See Extracted Metadata
      </Button>
      <Modal
        title="Automatically Appended Metadata"
        visible={isModalVisible}
        onCancel={handleCancel}
        footer={null}
      >
        <p className={styles.modalDescription}>
          The <strong>Metadata Extraction Service (MXS)</strong> automatically
          appends metadata from LabKey, microscopes, and other sources,
          including fields not defined in your template. This metadata is
          read-only in the File Upload App but editable in BioFile Finder by
          authorized users. All appended metadata for this file is shown below.
        </p>
        {metadataState.loading ? (
          <div className={styles.loadingSpinner}>
            <Spin />
          </div>
        ) : metadataState.metadata ? (
          <Table
            dataSource={Object.entries(metadataState.metadata).map(
              ([key, valueObj]) => ({
                key,
                field: key,
                value: String(valueObj.value),
              })
            )}
            columns={[
              { title: "Data Type", dataIndex: "field", key: "field" },
              { title: "Value", dataIndex: "value", key: "value" },
            ]}
            pagination={false}
            size="small"
          />
        ) : metadataState.error ? (
          <div>
            Error retrieving metadata for this file: {metadataState.error}
          </div>
        ) : (
          <div>No metadata available.</div>
        )}
      </Modal>
    </>
  );
}

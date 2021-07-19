import { AicsGridCell } from "@aics/aics-react-labkey";
import { Button, Modal } from "antd";
import { intersection, isEmpty, sortBy, uniq, without } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps } from "react-table";

import { AnnotationName } from "../../../../constants";
import { getImagingSessions } from "../../../../state/metadata/selectors";
import { getPlateBarcodeToImagingSessions } from "../../../../state/selection/selectors";
import { Well } from "../../../../state/selection/types";
import { updateUpload } from "../../../../state/upload/actions";
import { UploadTableRow } from "../../../../state/upload/types";
import Plate from "../../../Plate";
import DisplayCell from "../../DefaultCells/DisplayCell";

const styles = require("./styles.pcss");

/**
 * This is used in the react-tables when a user is editing a Well annotation cell.
 * It displays the currently selected well labels and a popover with the plate UI for associating more wells.
 */
export default function WellCell(props: CellProps<UploadTableRow>) {
  const dispatch = useDispatch();
  const imagingSessions = useSelector(getImagingSessions);
  const plateBarcodeToImagingSessions = useSelector(
    getPlateBarcodeToImagingSessions
  );
  const [isEditing, setIsEditing] = React.useState(false);
  const [selectedWells, setSelectedWells] = React.useState<AicsGridCell[]>([]);
  const associatedWells = props.row.original[AnnotationName.WELL] || [];
  const plateBarcode = props.row.original[AnnotationName.PLATE_BARCODE]?.[0];
  const imagingSessionName =
    props.row.original[AnnotationName.IMAGING_SESSION]?.[0];

  // TODO: Missing info about solutions and units????
  const wells = React.useMemo(() => {
    if (plateBarcode) {
      const platesWithImagingSessions =
        plateBarcodeToImagingSessions[plateBarcode];
      const imagingSession = imagingSessions.find(
        (is) => is.name === imagingSessionName
      );
      const wells =
        platesWithImagingSessions[imagingSession?.imagingSessionId || 0].wells;
      const sortedWells = sortBy(wells, ["row", "col"]);
      const rowCount = sortedWells[sortedWells.length - 1].row + 1;
      const colCount = sortedWells[sortedWells.length - 1].col + 1;

      const result: Well[][] = Array(rowCount)
        .fill(null)
        .map(() => Array(colCount).fill(null));
      wells.forEach((well) => {
        const { cellPopulations, col, row, solutions } = well;
        result[row][col] = {
          ...well,
          modified: !isEmpty(cellPopulations) || !isEmpty(solutions),
        };
      });

      return result;
    }
    return [[]];
  }, [
    plateBarcode,
    imagingSessionName,
    imagingSessions,
    plateBarcodeToImagingSessions,
  ]);

  const selectedWellIds = wells.flatMap((row) =>
    row.flatMap((well) =>
      selectedWells.some((sw) => sw.col === well.col && sw.row === well.row)
        ? [well.wellId]
        : []
    )
  );

  // Disable association button if no wells are selected or if
  // all of the wells have already been associated with
  const isAssociatiateButtonDisabled =
    isEmpty(selectedWells) ||
    intersection(selectedWellIds, associatedWells).length ===
      selectedWells.length;

  // Disable remove association button if no wells are selected or if none
  // of the wells selected have been associated with the row yet
  const isRemoveButtonDisabled =
    isEmpty(selectedWells) ||
    !intersection(selectedWellIds, associatedWells).length;

  function onAssociate() {
    setIsEditing(false);
    dispatch(
      updateUpload(props.row.id, {
        [AnnotationName.WELL]: uniq([...associatedWells, ...selectedWellIds]),
      })
    );
  }

  function onDissociate() {
    dispatch(
      updateUpload(props.row.id, {
        [AnnotationName.WELL]: without(associatedWells, ...selectedWellIds),
      })
    );
  }

  const content = (
    <div className={styles.container}>
      <div className={styles.btns}>
        <Button
          onClick={onAssociate}
          size="small"
          type="primary"
          className={styles.associateBtn}
          disabled={isAssociatiateButtonDisabled}
        >
          Associate
        </Button>
        <Button
          onClick={onDissociate}
          disabled={isRemoveButtonDisabled}
          size="small"
        >
          Remove Association
        </Button>
      </div>
      <div className={styles.plateContainer}>
        <Plate
          className={styles.plate}
          onSelect={(wells) => setSelectedWells(wells)}
          selectedWells={selectedWells}
          selectedWellIds={selectedWellIds}
          wells={wells}
        />
      </div>
    </div>
  );

  return (
    <>
      <DisplayCell
        {...props}
        onTabExit={() => setIsEditing(false)}
        onStartEditing={() => setIsEditing(true)}
      />
      <Modal
        title="Associate Wells with this row by selecting wells and clicking Associate"
        visible={isEditing}
        mask={false}
        onCancel={() => setIsEditing(false)}
        footer={null}
        width="625px"
        centered
        destroyOnClose
      >
        {content}
      </Modal>
    </>
  );
}

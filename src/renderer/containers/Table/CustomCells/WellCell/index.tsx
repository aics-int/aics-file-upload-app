import { AicsGridCell } from "@aics/aics-react-labkey";
import { Button, Modal } from "antd";
import { intersection, isEmpty, sortBy, uniq, without } from "lodash";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps } from "react-table";

import { AnnotationName } from "../../../../constants";
import { getPlateBarcodeToPlates } from "../../../../state/metadata/selectors";
import { Well } from "../../../../state/selection/types";
import { FileModel } from "../../../../state/types";
import { updateUpload } from "../../../../state/upload/actions";
import Plate from "../../../Plate";
import DisplayCell from "../../DefaultCells/DisplayCell";

const styles = require("./styles.pcss");

/***
 * Returns a human readable label representing the row and column of a well on a plate.
 * Assumes plate does not have more than 26 rows.
 */
function getWellLabel(well?: AicsGridCell, noneText = "None"): string {
  if (!well) {
    return noneText;
  }

  const row = String.fromCharCode(97 + (well.row % 26)).toUpperCase();
  const col = well.col + 1;
  return `${row}${col}`;
}

/**
 * This is used in the react-tables when a user is editing a Well annotation cell.
 * It displays the currently selected well labels and a popover with the plate UI for associating more wells.
 */
export default function WellCell(props: CellProps<FileModel>) {
  const dispatch = useDispatch();
  const plateBarcodeToPlates = useSelector(getPlateBarcodeToPlates);
  const [isEditing, setIsEditing] = React.useState(false);
  const [selectedWells, setSelectedWells] = React.useState<AicsGridCell[]>([]);
  const associatedWells = props.row.original[AnnotationName.WELL] || [];
  const plateBarcode = props.row.original[AnnotationName.PLATE_BARCODE]?.[0];
  const imagingSessionName =
    props.row.original[AnnotationName.IMAGING_SESSION]?.[0];

  const wells = React.useMemo(() => {
    if (plateBarcode && plateBarcodeToPlates[plateBarcode]) {
      const plates = plateBarcodeToPlates[plateBarcode];
      const wells = plates.find((p) =>
        imagingSessionName ? p.name === imagingSessionName : !p.name
      )?.wells;
      if (wells) {
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
            // If true, highlights well in special color
            modified: !isEmpty(cellPopulations) || !isEmpty(solutions),
          };
        });

        return result;
      }
    }
    return [[]];
  }, [plateBarcode, imagingSessionName, plateBarcodeToPlates]);

  const wellLabels: string[] = [];
  const selectedWellIds: number[] = [];
  wells.forEach((row) => {
    row.forEach((well) => {
      if (associatedWells.includes(well.wellId)) {
        wellLabels.push(getWellLabel(well));
      }
      if (
        selectedWells.some((sw) => sw.col === well.col && sw.row === well.row)
      ) {
        selectedWellIds.push(well.wellId);
      }
    });
  });

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
          associatedWellIds={associatedWells}
          wells={wells}
        />
      </div>
    </div>
  );

  return (
    <>
      <DisplayCell
        {...props}
        value={wellLabels.sort()}
        disabled={!wells?.[0].length}
        onTabExit={() => setIsEditing(false)}
        onStartEditing={() => wells?.[0].length && setIsEditing(true)}
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

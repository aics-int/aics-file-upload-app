import { Divider, Icon, Menu, Tooltip } from "antd";
import SubMenu from "antd/lib/menu/SubMenu";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { CellProps } from "react-table";

import { AnnotationName } from "../../../../constants";
import { BarcodePrefix } from "../../../../services/labkey-client/types";
import { getRequestsInProgress } from "../../../../state/feedback/selectors";
import {
  createBarcode,
  requestBarcodeSearchResults,
} from "../../../../state/metadata/actions";
import {
  getBarcodePrefixes,
  getUniqueBarcodeSearchResults,
} from "../../../../state/metadata/selectors";
import { AsyncRequest, BarcodeSelectorOption } from "../../../../state/types";
import { updateUpload } from "../../../../state/upload/actions";
import { UploadTableRow } from "../../../../state/upload/types";
import LookupSearch from "../../../LookupSearch";
import DisplayCell from "../../DefaultCells/DisplayCell";
import { createEnterKeyHandler } from "../../Editors/util";

const styles = require("./styles.pcss");

/**
 * Component responsible for rendering an input for a
 * react-table instance that queries for plates by partial
 * barcode match.
 */
export default function PlateBarcodeCell(
  props: CellProps<UploadTableRow, string[]>
) {
  const dispatch = useDispatch();
  const barcodePrefixes = useSelector(getBarcodePrefixes);
  const requestsInProgress = useSelector(getRequestsInProgress);
  const barcodeSearchResults = useSelector(getUniqueBarcodeSearchResults);

  const [isEditing, setIsEditing] = React.useState(false);
  const [plateBarcode, setPlateBarcode] = React.useState<string | undefined>(
    props.value?.[0]
  );

  // Derive state from changes outside of direct editing
  React.useEffect(() => {
    setPlateBarcode(props.value?.[0]);
  }, [props.value, setPlateBarcode]);

  const isLoading = requestsInProgress.includes(
    AsyncRequest.GET_BARCODE_SEARCH_RESULTS
  );

  function onCommit() {
    setIsEditing(false);
    dispatch(
      updateUpload(props.row.id, {
        [props.column.id]: plateBarcode ? [plateBarcode] : [],
        [AnnotationName.IMAGING_SESSION]: [],
        [AnnotationName.WELL]: [],
      })
    );
  }

  function onBarcodePrefixMouseDown(bp: BarcodePrefix) {
    dispatch(createBarcode(bp, props.row.id));
    onCommit();
  }

  if (isEditing) {
    return (
      <LookupSearch
        autoFocus
        className={styles.plateBarcodeCell}
        getDisplayFromOption={(result: BarcodeSelectorOption) => result.barcode}
        lookupAnnotationName="barcodeSearchResults"
        dropdownRender={(menu: React.ReactNode | undefined) => (
          <div>
            {menu}
            <>
              <Divider className={styles.divider} />
              <Menu className={styles.menu} mode="vertical">
                <SubMenu
                  className={styles.menu}
                  key="create-barcode"
                  title={
                    <>
                      <Icon className={styles.icon} type="plus-circle" />
                      <span className={styles.text}>
                        Create {props.column.id}
                      </span>
                    </>
                  }
                >
                  {barcodePrefixes.map((bp) => (
                    /* This is not onClick because of a bug here https://github.com/ant-design/ant-design/issues/16209
                     * Hopefully we can change this to onClick after we upgrade antd to the latest version in FUA-6
                     * */
                    <Menu.Item
                      key={bp.prefix}
                      onMouseDown={() => onBarcodePrefixMouseDown(bp)}
                    >
                      <Tooltip overlay={bp.description}>{bp.prefix}</Tooltip>
                    </Menu.Item>
                  ))}
                </SubMenu>
              </Menu>
            </>
          </div>
        )}
        mode="default"
        optionsLoadingOverride={isLoading}
        optionsOverride={barcodeSearchResults}
        placeholder="Type to search"
        retrieveOptionsOverride={(i?: string) =>
          i && dispatch(requestBarcodeSearchResults(i))
        }
        onBlur={onCommit}
        onInputKeyDown={createEnterKeyHandler(onCommit)}
        selectSearchValue={(pb?: string) => setPlateBarcode(pb)}
        value={props.value?.[0]}
      />
    );
  }

  return (
    <DisplayCell
      {...props}
      onTabExit={() => setIsEditing(false)}
      onStartEditing={() => setIsEditing(true)}
    />
  );
}

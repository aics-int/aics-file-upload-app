import { Button, Dropdown, Spin, Tooltip } from "antd";
import { remote } from "electron";
import { isEmpty, uniqBy } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row } from "react-table";

import DragAndDrop from "../../components/DragAndDrop";
import NewUploadMenu from "../../components/NewUploadMenu";
import { TOOLTIP_ENTER_DELAY, TOOLTIP_LEAVE_DELAY } from "../../constants";
import {
  IN_PROGRESS_STATUSES,
  JSSJobStatus,
} from "../../services/job-status-service/types";
import { getRequestsInProgress } from "../../state/feedback/selectors";
import { getUploadsByTemplateUsage } from "../../state/job/selectors";
import { startNewUpload, viewUploads } from "../../state/route/actions";
import { AsyncRequest, UploadSummaryTableRow } from "../../state/types";
import {
  cancelUploads,
  retryUploads,
  uploadWithoutMetadata,
} from "../../state/upload/actions";
import UploadTable from "../UploadTable";

const styles = require("./styles.pcss");

/**
 * This component represents the "My Uploads" page for the user. The
 * user's uploads are displayed as tables and are presented with options
 * to interact with existing uploads as well as options to upload.
 */
export default function MyUploadsPage() {
  const dispatch = useDispatch();
  const { uploadsWithTemplates, uploadsWithoutTemplates } = useSelector(
    getUploadsByTemplateUsage
  );
  const requestsInProgress = useSelector(getRequestsInProgress);
  const isRequestingJobs = requestsInProgress.includes(AsyncRequest.GET_JOBS);

  const [selectedUploads, setSelectedUploads] = React.useState<
    UploadSummaryTableRow[]
  >([]);

  const [
    areSelectedUploadsAllFailed,
    areSelectedUploadsAllInProgress,
  ] = React.useMemo(() => {
    const selectedAllFailedUploads = selectedUploads.every(
      (upload) => upload.status === JSSJobStatus.FAILED
    );
    let selectedAllInProgressUploads = false;
    if (!selectedAllFailedUploads) {
      selectedAllInProgressUploads = selectedUploads.every((upload) =>
        IN_PROGRESS_STATUSES.includes(upload.status)
      );
    }
    return [selectedAllFailedUploads, selectedAllInProgressUploads];
  }, [selectedUploads]);

  // Wrap as callback to avoid unnecessary renders due to referential equality between
  // onSelect references in TableRow
  const onSelect = React.useCallback(
    (rows: Row<UploadSummaryTableRow>[], isDeselecting: boolean) => {
      if (isDeselecting) {
        const rowIds = new Set(rows.map((r) => r.id));
        setSelectedUploads(selectedUploads.filter((u) => !rowIds.has(u.jobId)));
      } else {
        const uploads = rows.map((r) => r.original);
        setSelectedUploads(uniqBy([...selectedUploads, ...uploads], "jobId"));
      }
    },
    [selectedUploads, setSelectedUploads]
  );

  function onView() {
    dispatch(viewUploads(selectedUploads));
    setSelectedUploads([]);
  }

  function onRetry() {
    dispatch(retryUploads(selectedUploads));
    setSelectedUploads([]);
  }

  function onCancel() {
    dispatch(cancelUploads(selectedUploads));
    setSelectedUploads([]);
  }

  function onContextMenu(
    row: Row<UploadSummaryTableRow>,
    onCloseCallback: () => void
  ) {
    remote.Menu.buildFromTemplate([
      {
        label: "View",
        click: () => dispatch(viewUploads([row.original])),
      },
      {
        label: "Retry",
        enabled: row.original.status === JSSJobStatus.FAILED,
        click: () => dispatch(retryUploads([row.original])),
      },
      {
        label: "Cancel",
        enabled: IN_PROGRESS_STATUSES.includes(row.original.status),
        click: () => dispatch(cancelUploads([row.original])),
      },
    ]).popup({ callback: onCloseCallback });
  }

  function onUploadWithoutTemplate(filePaths: string[]) {
    // If cancel is clicked, this callback gets called and filePaths is undefined
    if (!isEmpty(filePaths)) {
      dispatch(uploadWithoutMetadata(filePaths));
    }
  }

  const dropdownMenu = (
    <NewUploadMenu
      onUploadWithTemplate={() => dispatch(startNewUpload())}
      onUploadWithoutTemplate={onUploadWithoutTemplate}
    />
  );

  return (
    <DragAndDrop
      className={styles.dragAndDropBox}
      overlayChildren={false}
      onDrop={onUploadWithoutTemplate}
    >
      <div className={styles.container}>
        <div className={styles.header}>
          <h2>My Uploads</h2>
          <div className={styles.tableToolBar}>
            <div>
              <Tooltip
                title="View Selected Uploads"
                mouseEnterDelay={TOOLTIP_ENTER_DELAY}
                mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
              >
                <Button
                  className={styles.tableToolBarButton}
                  onClick={onView}
                  disabled={isEmpty(selectedUploads)}
                  icon="file-search"
                >
                  View
                </Button>
              </Tooltip>
              <Tooltip
                title="Retry Selected Uploads"
                mouseEnterDelay={TOOLTIP_ENTER_DELAY}
                mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
              >
                <Button
                  className={styles.tableToolBarButton}
                  onClick={onRetry}
                  disabled={
                    isEmpty(selectedUploads) || !areSelectedUploadsAllFailed
                  }
                  icon="redo"
                >
                  Retry
                </Button>
              </Tooltip>
              <Tooltip
                title="Cancel Selected Uploads"
                mouseEnterDelay={TOOLTIP_ENTER_DELAY}
                mouseLeaveDelay={TOOLTIP_LEAVE_DELAY}
              >
                <Button
                  className={styles.tableToolBarButton}
                  onClick={onCancel}
                  disabled={
                    isEmpty(selectedUploads) || !areSelectedUploadsAllInProgress
                  }
                  icon="stop"
                >
                  Cancel
                </Button>
              </Tooltip>
            </div>
            <Dropdown
              className={styles.newUploadButton}
              overlay={dropdownMenu}
              trigger={["click", "hover"]}
            >
              <Button icon="plus">Upload</Button>
            </Dropdown>
          </div>
        </div>
        <div className={styles.tableContainer}>
          {isRequestingJobs ? (
            <div className={styles.loadingContainer}>
              <Spin size="large" />
            </div>
          ) : (
            <>
              {!!uploadsWithoutTemplates.length && (
                <UploadTable
                  title="Uploads Missing Metadata Templates"
                  uploads={uploadsWithoutTemplates}
                  onContextMenu={onContextMenu}
                  onSelect={onSelect}
                />
              )}
              <UploadTable
                title="Uploads With Metadata Templates"
                uploads={uploadsWithTemplates}
                onContextMenu={onContextMenu}
                onSelect={onSelect}
              />
            </>
          )}
        </div>
      </div>
    </DragAndDrop>
  );
}

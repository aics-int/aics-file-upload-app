import {
  FileSearchOutlined,
  RedoOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { Button, Menu, Spin, Tooltip } from "antd";
import { isEmpty, uniqBy } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";
import { Row } from "react-table";

import { TOOLTIP_ENTER_DELAY, TOOLTIP_LEAVE_DELAY } from "../../constants";
import {
  IN_PROGRESS_STATUSES,
  JSSJobStatus,
} from "../../services/job-status-service/types";
import { getRequestsInProgress } from "../../state/feedback/selectors";
import { getRecentUploads } from "../../state/job/selectors";
import { viewUploads } from "../../state/route/actions";
import { AsyncRequest, UploadSummaryTableRow } from "../../state/types";
import { cancelUploads, retryUploads } from "../../state/upload/actions";
import UploadTable from "../UploadTable";

const styles = require("./styles.pcss");

/**
 * This component represents the "My Uploads" page for the user. The
 * user's uploads are displayed as tables and are presented with options
 * to interact with existing uploads as well as options to upload.
 */
export default function MyUploadsPage() {
  const dispatch = useDispatch();
  const recentUploads = useSelector(getRecentUploads).slice(0, 100);
  const requestsInProgress = useSelector(getRequestsInProgress);
  const isRequestingJobs = requestsInProgress.includes(AsyncRequest.GET_JOBS);

  const [selectedUploads, setSelectedUploads] = React.useState<
    UploadSummaryTableRow[]
  >([]);

  const [areSelectedUploadsAllFailed, areSelectedUploadsAllInProgress] =
    React.useMemo(() => {
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

  function getContextMenuItems(row: Row<UploadSummaryTableRow>) {
    const onRowView = () => {
      dispatch(viewUploads([row.original]));
    };
    const onRowRetry = () => {
      dispatch(retryUploads([row.original]));
    };
    const onRowCancel = () => {
      dispatch(cancelUploads([row.original]));
    };

    return (
      <Menu>
        <Menu.Item onClick={onRowView}>View</Menu.Item>
        <Menu.Item
          disabled={row.original.status !== JSSJobStatus.FAILED}
          onClick={onRowRetry}
        >
          Retry
        </Menu.Item>
        <Menu.Item
          disabled={!IN_PROGRESS_STATUSES.includes(row.original.status)}
          onClick={onRowCancel}
        >
          Cancel
        </Menu.Item>
      </Menu>
    );
  }

  return (
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
                icon={<FileSearchOutlined />}
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
                icon={<RedoOutlined />}
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
                icon={<StopOutlined />}
              >
                Cancel
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
      <div className={styles.tableContainer}>
        {isRequestingJobs ? (
          <div className={styles.loadingContainer}>
            <Spin size="large" />
          </div>
        ) : (
          <UploadTable
            uploads={recentUploads}
            getContextMenuItems={getContextMenuItems}
            onSelect={onSelect}
          />
        )}
      </div>
    </div>
  );
}

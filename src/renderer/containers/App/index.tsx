import "@aics/aics-react-labkey/dist/styles.css";
import { message } from "antd";
import { ipcRenderer, remote } from "electron";
import { camelizeKeys } from "humps";
import * as React from "react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  OPEN_UPLOAD_DRAFT_MENU_ITEM_CLICKED,
  SAFELY_CLOSE_WINDOW,
  SAVE_UPLOAD_DRAFT_MENU_ITEM_CLICKED,
  SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED,
} from "../../../shared/constants";
import StatusBar from "../../components/StatusBar";
import { FSSUpload } from "../../services/file-storage-service";
import {
  JSSJob,
  JSSJobStatus,
  Service,
  UploadJob,
} from "../../services/job-status-service/types";
import {
  addRequestToInProgress,
  checkForUpdate,
  clearAlert,
  removeRequestFromInProgress,
  setErrorAlert,
  setSuccessAlert,
} from "../../state/feedback/actions";
import { getAlert, getRecentEvent } from "../../state/feedback/selectors";
import {
  receiveFSSJobCompletionUpdate,
  receiveJobInsert,
  receiveJobs,
  receiveJobUpdate,
} from "../../state/job/actions";
import { getIsSafeToExit } from "../../state/job/selectors";
import {
  requestMetadata,
  requestTemplates,
} from "../../state/metadata/actions";
import { getPage } from "../../state/route/selectors";
import {
  gatherSettings,
  openEnvironmentDialog,
} from "../../state/setting/actions";
import { getLimsUrl, getLoggedInUser } from "../../state/setting/selectors";
import { AlertType, AsyncRequest, Page } from "../../state/types";
import { openUploadDraft, saveUploadDraft } from "../../state/upload/actions";
import MyUploadsPage from "../MyUploadsPage";
import NavigationBar from "../NavigationBar";
import OpenTemplateModal from "../OpenTemplateModal";
import TemplateEditorModal from "../TemplateEditorModal";
import UploadWithTemplatePage from "../UploadWithTemplatePage";

import AutoReconnectingEventSource from "./AutoReconnectingEventSource";

const styles = require("./styles.pcss");

const ALERT_DURATION = 2;

message.config({
  maxCount: 1,
});

export default function App() {
  const dispatch = useDispatch();

  const alert = useSelector(getAlert);
  const isSafeToExit = useSelector(getIsSafeToExit);
  const limsUrl = useSelector(getLimsUrl);
  const user = useSelector(getLoggedInUser);
  const page = useSelector(getPage);
  const recentEvent = useSelector(getRecentEvent);

  // Request initial data
  useEffect(() => {
    dispatch(checkForUpdate());
    dispatch(requestMetadata());
    dispatch(requestTemplates());
    dispatch(gatherSettings());
  }, [dispatch]);

  // Subscribe to job changes for current `limsUrl` and `user`
  useEffect(() => {
    dispatch(addRequestToInProgress(AsyncRequest.GET_JOBS));
    const eventSource = new AutoReconnectingEventSource(
      `${limsUrl}/jss/1.0/job/subscribe/${user}`,
      { withCredentials: true }
    );

    eventSource.addEventListener("initialJobs", (event: MessageEvent) => {
      dispatch(removeRequestFromInProgress(AsyncRequest.GET_JOBS));
      const jobs = camelizeKeys(JSON.parse(event.data)) as JSSJob[];
      // Separate user's other jobs from ones created by this app
      // also filter out any replaced jobs
      const uploadJobs = jobs.filter(
        (job) =>
          job.serviceFields?.type === "upload" &&
          !job.serviceFields?.replacementJobIds
      ) as UploadJob[];
      dispatch(receiveJobs(uploadJobs));
    });

    eventSource.addEventListener("jobInsert", (event: MessageEvent) => {
      const job = camelizeKeys(JSON.parse(event.data)) as JSSJob;
      // Separate user's other jobs from ones created by this app
      if (job.serviceFields?.type === "upload") {
        dispatch(receiveJobInsert(job as UploadJob));
      }
    });

    eventSource.addEventListener("jobUpdate", (event: MessageEvent) => {
      const job = camelizeKeys(JSON.parse(event.data)) as JSSJob;
      // An FSS job update is only important to us when it is signaling
      // the addition of the fileId i.e. FSS's completion or has failed
      if (
        job.service === Service.FILE_STORAGE_SERVICE &&
        (job.serviceFields?.fileId || job.status === JSSJobStatus.FAILED)
      ) {
        dispatch(receiveFSSJobCompletionUpdate(job as FSSUpload));
      } else if (job.serviceFields?.type === "upload") {
        // Otherwise separate user's other jobs from ones created by this app
        dispatch(receiveJobUpdate(job as UploadJob));
      }
    });

    eventSource.onDisconnect(() =>
      dispatch(
        setErrorAlert(
          "Lost connection to the server, attempting to reconnect..."
        )
      )
    );

    eventSource.onReconnect(() =>
      dispatch(setSuccessAlert("Reconnected successfully!"))
    );

    return function cleanUp() {
      eventSource.close();
    };
  }, [limsUrl, user, dispatch]);

  // Event handlers for menu events
  useEffect(() => {
    ipcRenderer.on(SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED, () =>
      dispatch(openEnvironmentDialog())
    );
    ipcRenderer.on(SAVE_UPLOAD_DRAFT_MENU_ITEM_CLICKED, () =>
      dispatch(saveUploadDraft(true))
    );
    ipcRenderer.on(OPEN_UPLOAD_DRAFT_MENU_ITEM_CLICKED, () =>
      dispatch(openUploadDraft())
    );

    return function cleanUp() {
      ipcRenderer.removeAllListeners(SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED);
      ipcRenderer.removeAllListeners(SAVE_UPLOAD_DRAFT_MENU_ITEM_CLICKED);
      ipcRenderer.removeAllListeners(OPEN_UPLOAD_DRAFT_MENU_ITEM_CLICKED);
    };
  }, [dispatch]);

  // This one needs a special event handler that will be recreated whenever
  // `isSafeToExit` changes, since it is reliant on that value.
  useEffect(() => {
    ipcRenderer.on(SAFELY_CLOSE_WINDOW, () => {
      const warning =
        "Uploads are in progress. Exiting now may cause incomplete uploads to be abandoned and" +
        " will need to be manually cancelled. Are you sure?";
      if (isSafeToExit) {
        remote.app.exit();
      } else {
        remote.dialog
          .showMessageBox({
            buttons: ["Cancel", "Close Anyways"],
            message: warning,
            title: "Danger!",
            type: "warning",
          })
          .then((value: Electron.MessageBoxReturnValue) => {
            // value.response corresponds to button index
            if (value.response === 1) {
              remote.app.exit();
            }
          });
      }
    });

    return function cleanUp() {
      ipcRenderer.removeAllListeners(SAFELY_CLOSE_WINDOW);
    };
  }, [isSafeToExit, dispatch]);

  useEffect(() => {
    if (alert) {
      const { message: alertText, manualClear, type } = alert;
      const alertBody = (
        <div dangerouslySetInnerHTML={{ __html: alertText || "" }} />
      );
      const duration = manualClear ? 0 : ALERT_DURATION;

      switch (type) {
        case AlertType.WARN:
          message.warn(alertBody, duration);
          break;
        case AlertType.SUCCESS:
          message.success(alertBody, duration);
          break;
        case AlertType.ERROR:
          message.error(alertBody, duration);
          break;
        default:
          message.info(alertBody, duration);
          break;
      }

      dispatch(clearAlert());
    }
  }, [alert, dispatch]);

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
        <NavigationBar />
        {page === Page.MyUploads && <MyUploadsPage />}
        {page === Page.UploadWithTemplate && <UploadWithTemplatePage />}
      </div>
      <StatusBar
        className={styles.statusBar}
        event={recentEvent}
        limsUrl={limsUrl}
      />
      <TemplateEditorModal />
      <OpenTemplateModal />
    </div>
  );
}

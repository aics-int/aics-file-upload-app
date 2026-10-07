import "@aics/aics-react-labkey/dist/styles.css";
import { message } from "antd";
import { ipcRenderer } from "electron";
import { camelizeKeys } from "humps";
import * as React from "react";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import {
  MainProcessEvents,
  RendererProcessEvents,
} from "../../../shared/constants";
import StatusBar from "../../components/StatusBar";
import JSSResponseMapper from "../../services/job-status-service/jss-response-mapper";
import { Service, UploadJob } from "../../services/job-status-service/types";
import { jssClient } from "../../state/configure-store";
import {
  addRequestToInProgress,
  checkForUpdate,
  clearAlert,
  removeRequestFromInProgress,
  setErrorAlert,
  setSuccessAlert,
} from "../../state/feedback/actions";
import { getAlert, getRecentEvent } from "../../state/feedback/selectors";
import { receiveJobs, receiveJobUpdate } from "../../state/job/actions";
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
import AddMetadataPage from "../AddMetadataPage";
import MyUploadsPage from "../MyUploadsPage";
import NavigationBar from "../NavigationBar";
import OpenTemplateModal from "../OpenTemplateModal";
import TemplateEditorModal from "../TemplateEditorModal";
import UploadSelectionPage from "../UploadSelectionPage";

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
    // Also run on reconnect, since events missed while disconnected are not resent
    async function requestUploadJobs() {
      dispatch(addRequestToInProgress(AsyncRequest.GET_JOBS));
      try {
        const uploadJobs = await jssClient.getAllJobs({
          user,
          service: Service.FILE_STORAGE_SERVICE,
          parentId: { $eq: null },
          serviceFields: { uploadRequest: { type: "upload" } },
        });
        dispatch(receiveJobs(uploadJobs as UploadJob[]));
      } catch (error) {
        dispatch(removeRequestFromInProgress(AsyncRequest.GET_JOBS));
        dispatch(
          setErrorAlert(`Could not retrieve recent uploads: ${error.message}`)
        );
      }
    }
    requestUploadJobs();

    const eventSource = new AutoReconnectingEventSource(
      `${limsUrl}/jss/2.0/job/subscribe?user=${user}`,
      { withCredentials: true }
    );

    // Upload jobs first appear when the app saves its upload request onto the storage service's job.
    // Child jobs are skipped, the parent job carries the upload's progress and stage.
    const onJobChange = (event: MessageEvent) => {
      const job = JSSResponseMapper.map(
        camelizeKeys(JSON.parse(event.data)) as UploadJob
      );
      if (
        job.service === Service.FILE_STORAGE_SERVICE &&
        !job.parentId &&
        job.serviceFields?.uploadRequest
      ) {
        dispatch(receiveJobUpdate(job));
      }
    };
    eventSource.addEventListener("jobInsert", onJobChange);
    eventSource.addEventListener("jobUpdate", onJobChange);

    eventSource.onDisconnect(() =>
      dispatch(
        setErrorAlert(
          "Lost connection to the server, attempting to reconnect..."
        )
      )
    );

    eventSource.onReconnect(() => {
      dispatch(setSuccessAlert("Reconnected successfully!"));
      requestUploadJobs();
    });

    return function cleanUp() {
      eventSource.close();
    };
  }, [limsUrl, user, dispatch]);

  // Event handlers for menu events
  useEffect(() => {
    ipcRenderer.on(MainProcessEvents.OPEN_UPLOAD_DRAFT_MENU_ITEM_CLICKED, () =>
      dispatch(openUploadDraft())
    );
    ipcRenderer.on(MainProcessEvents.SAVE_UPLOAD_DRAFT_MENU_ITEM_CLICKED, () =>
      dispatch(saveUploadDraft(true))
    );
    ipcRenderer.on(MainProcessEvents.SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED, () =>
      dispatch(openEnvironmentDialog())
    );

    return function cleanUp() {
      ipcRenderer.removeAllListeners(
        MainProcessEvents.SWITCH_ENVIRONMENT_MENU_ITEM_CLICKED
      );
      ipcRenderer.removeAllListeners(
        MainProcessEvents.SAVE_UPLOAD_DRAFT_MENU_ITEM_CLICKED
      );
      ipcRenderer.removeAllListeners(
        MainProcessEvents.OPEN_UPLOAD_DRAFT_MENU_ITEM_CLICKED
      );
    };
  }, [dispatch]);

  // This one needs a special event handler that will be recreated whenever
  // `isSafeToExit` changes, since it is reliant on that value.
  useEffect(() => {
    ipcRenderer.on(MainProcessEvents.SAFELY_CLOSE_WINDOW, async () => {
      if (isSafeToExit) {
        ipcRenderer.send(RendererProcessEvents.CLOSE_WINDOW);
      } else {
        const warning =
          "Uploads are in progress. Exiting now may cause incomplete uploads to be abandoned and" +
          " will need to be manually cancelled. Are you sure?";
        const buttonIndex = await ipcRenderer.invoke(
          RendererProcessEvents.SHOW_MESSAGE_BOX,
          {
            buttons: ["Cancel", "Close Anyways"],
            message: warning,
            title: "Danger!",
            type: "warning",
          }
        );
        if (buttonIndex === 1) {
          ipcRenderer.send(RendererProcessEvents.CLOSE_WINDOW);
        }
      }
    });

    return function cleanUp() {
      ipcRenderer.removeAllListeners(MainProcessEvents.SAFELY_CLOSE_WINDOW);
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
        {page === Page.UploadWithTemplate && <UploadSelectionPage />}
        {page === Page.AddMetadata && <AddMetadataPage />}
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

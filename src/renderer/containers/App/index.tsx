import "@aics/aics-react-labkey/dist/styles.css";
import { message } from "antd";
import { ipcRenderer } from "electron";
import { camelizeKeys } from "humps";
import * as React from "react";
import { useEffect } from "react";
import { useDispatch, useSelector, useStore } from "react-redux";

import {
  MainProcessEvents,
  RendererProcessEvents,
} from "../../../shared/constants";
import StatusBar from "../../components/StatusBar";
import JSSResponseMapper from "../../services/job-status-service/jss-response-mapper";
import {
  JSSJob,
  Service,
  UploadJob,
} from "../../services/job-status-service/types";
import { jssV2Client } from "../../state/configure-store";
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
  receiveJobInsert,
  receiveJobs,
  receiveJobUpdate,
} from "../../state/job/actions";
import { getIsSafeToExit, getUploadJobs } from "../../state/job/selectors";
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
import { AlertType, AsyncRequest, Page, State } from "../../state/types";
import { openUploadDraft, saveUploadDraft } from "../../state/upload/actions";
import AddMetadataPage from "../AddMetadataPage";
import MyUploadsPage from "../MyUploadsPage";
import NavigationBar from "../NavigationBar";
import OpenTemplateModal from "../OpenTemplateModal";
import TemplateEditorModal from "../TemplateEditorModal";
import UploadSelectionPage from "../UploadSelectionPage";

import AutoReconnectingEventSource from "./AutoReconnectingEventSource";
import { handleUploadJobUpdates } from "./handleUploadJobUpdates";

const styles = require("./styles.pcss");

const ALERT_DURATION = 2;

message.config({
  maxCount: 1,
});

export default function App() {
  const dispatch = useDispatch();
  const store = useStore<State>();

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
    const v2BootstrapPromise = (async () => {
      try {
        const v2UploadJobs = await jssV2Client.getAllJobs({
          user,
          service: Service.FILE_STORAGE_SERVICE,
          parentId: { $eq: null },
        });
        dispatch(receiveJobs(v2UploadJobs as UploadJob[]));
      } catch (error) {
        dispatch(
          setErrorAlert(`Could not retrieve recent uploads: ${error.message}`)
        );
      }
      dispatch(removeRequestFromInProgress(AsyncRequest.GET_JOBS));
    })();

    const v2EventSource = new AutoReconnectingEventSource(
      `${limsUrl}/jss/2.0/job/subscribe?user=${user}`,
      { withCredentials: true }
    );
    // Child jobs are skipped, the parent job carries the upload's progress and stage
    const parseV2UploadJob = (event: MessageEvent): UploadJob | undefined => {
      const job = JSSResponseMapper.map(
        camelizeKeys(JSON.parse(event.data)) as UploadJob
      );
      return job.service === Service.FILE_STORAGE_SERVICE && !job.parentId
        ? job
        : undefined;
    };

    v2EventSource.addEventListener("jobInsert", (event: MessageEvent) => {
      const job = parseV2UploadJob(event);
      if (job) {
        dispatch(receiveJobInsert(job));
      }
    });

    v2EventSource.addEventListener("jobUpdate", (event: MessageEvent) => {
      const job = parseV2UploadJob(event);
      if (job) {
        dispatch(receiveJobUpdate(job));
      }
    });

    const eventSource = new AutoReconnectingEventSource(
      `${limsUrl}/jss/1.0/job/subscribe/${user}`,
      { withCredentials: true }
    );

    eventSource.addEventListener("initialJobs", async (event: MessageEvent) => {
      // Wait for the 2.0 jobs so they are kept rather than overwritten
      await v2BootstrapPromise;
      const v2UploadJobs = getUploadJobs(store.getState()).filter(
        (job) => job.service === Service.FILE_STORAGE_SERVICE
      );
      const jobs = camelizeKeys(JSON.parse(event.data)) as JSSJob[];
      // Separate user's other jobs from ones created by this app
      // also filter out any replaced jobs
      const uploadJobs = jobs.filter(
        (job) =>
          job.serviceFields?.type === "upload" &&
          !job.serviceFields?.replacementJobIds
      ) as UploadJob[];
      dispatch(receiveJobs([...uploadJobs, ...v2UploadJobs]));
    });

    eventSource.addEventListener("jobInsert", (event: MessageEvent) => {
      const job = camelizeKeys(JSON.parse(event.data) as object) as JSSJob;
      // Separate user's other jobs from ones created by this app
      if (job.serviceFields?.type === "upload") {
        dispatch(receiveJobInsert(job as UploadJob));
      }
    });

    eventSource.addEventListener("jobUpdate", (event: MessageEvent) => {
      const job = camelizeKeys(JSON.parse(event.data) as object) as JSSJob;
      handleUploadJobUpdates(job, dispatch);
    });

    // Alert once for both streams
    let disconnectedStreamCount = 0;
    const onDisconnect = () => {
      disconnectedStreamCount++;
      if (disconnectedStreamCount === 1) {
        dispatch(
          setErrorAlert(
            "Lost connection to the server, attempting to reconnect..."
          )
        );
      }
    };
    const onReconnect = () => {
      disconnectedStreamCount--;
      if (disconnectedStreamCount === 0) {
        dispatch(setSuccessAlert("Reconnected successfully!"));
      }
    };
    eventSource.onDisconnect(onDisconnect);
    eventSource.onReconnect(onReconnect);
    v2EventSource.onDisconnect(onDisconnect);
    v2EventSource.onReconnect(onReconnect);

    return function cleanUp() {
      eventSource.close();
      v2EventSource.close();
    };
  }, [limsUrl, user, dispatch, store]);

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

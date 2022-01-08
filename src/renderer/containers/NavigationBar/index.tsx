import { ipcRenderer } from "electron";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { MainProcessEvents } from "../../../shared/constants";
import { selectPage, selectView } from "../../state/route/actions";
import { getView } from "../../state/route/selectors";
import { Page } from "../../state/types";
import { getUpload } from "../../state/upload/selectors";
import NewUploadModal from "../NewUploadModal";
import NotificationViewer from "../NotificationViewer";
import SettingsModal from "../SettingsModal";

import NavigationButton from "./NavigationButton";

const styles = require("./styles.pcss");

export default function NavigationBar() {
  const dispatch = useDispatch();
  const view = useSelector(getView);
  const uploads = useSelector(getUpload);
  const isUploadJobInProgress = Boolean(Object.keys(uploads).length);

  // Catch signals to open the settings modal from the file menu bar
  React.useEffect(() => {
    ipcRenderer.on(MainProcessEvents.OPEN_SETTINGS_EDITOR, () =>
      dispatch(selectView(Page.Settings))
    );

    return function cleanUp() {
      ipcRenderer.removeAllListeners(MainProcessEvents.OPEN_SETTINGS_EDITOR);
    };
  }, [dispatch]);

  function onSelectUpload() {
    if (isUploadJobInProgress) {
      dispatch(selectPage(Page.UploadWithTemplate));
    } else {
      dispatch(selectView(Page.NewUploadButton));
    }
  }

  return (
    <div className={styles.container}>
      <NotificationViewer isSelected={view === Page.Notifications} />
      <NavigationButton
        icon="upload"
        isSelected={[Page.UploadWithTemplate, Page.NewUploadButton].includes(
          view
        )}
        onSelect={onSelectUpload}
        title={isUploadJobInProgress ? "Current Upload" : "+Upload"}
      />
      <NavigationButton
        icon="profile"
        iconTheme="filled"
        isSelected={view === Page.MyUploads}
        onSelect={() => dispatch(selectPage(Page.MyUploads))}
        title="My Uploads"
      />
      <NavigationButton
        icon="setting"
        iconTheme="filled"
        isSelected={view === Page.Settings}
        onSelect={() => dispatch(selectView(Page.Settings))}
        title="Settings"
      />
      <NewUploadModal visible={view === Page.NewUploadButton} />
      <SettingsModal visible={view === Page.Settings} />
    </div>
  );
}

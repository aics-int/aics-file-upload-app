import { ProfileFilled, SettingFilled, UploadOutlined } from "@ant-design/icons";
import { ipcRenderer } from "electron";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { MainProcessEvents } from "../../../shared/constants";
import { selectPage, selectView } from "../../state/route/actions";
import { getView } from "../../state/route/selectors";
import { Page } from "../../state/types";
import { getUpload } from "../../state/upload/selectors";
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

  return (
    <div className={styles.container}>
      <NotificationViewer isSelected={view === Page.Notifications} />
      <NavigationButton
        icon={(props) => <UploadOutlined {...props} />}
        isSelected={[Page.UploadWithTemplate, Page.NewUploadButton, Page.AddMetadata].includes(
          view
        )}
        onSelect={() => dispatch(selectPage(Page.UploadWithTemplate))}
        title={isUploadJobInProgress ? "Current Upload" : "+Upload"}
      />
      <NavigationButton
        icon={(props) => <ProfileFilled {...props} />}
        isSelected={view === Page.MyUploads}
        onSelect={() => dispatch(selectPage(Page.MyUploads))}
        title="My Uploads"
      />
      <NavigationButton
        icon={(props) => <SettingFilled {...props} />}
        isSelected={view === Page.Settings}
        onSelect={() => dispatch(selectView(Page.Settings))}
        title="Settings"
      />
      <SettingsModal visible={view === Page.Settings} />
    </div>
  );
}

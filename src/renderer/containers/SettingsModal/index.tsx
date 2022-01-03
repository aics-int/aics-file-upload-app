import { Modal } from "antd";
import React from "react";
import { useDispatch, useSelector } from "react-redux";

import { updateSettings } from "../../state/setting/actions";
import { getEditableSettings } from "../../state/setting/selectors";
import {
  AlertType,
  EnabledNotifications,
  SettingStateBranch,
} from "../../state/types";

import SettingToggle from "./SettingToggle";

const styles = require("./styles.pcss");

const genericSettingsItems = [
  {
    type: AlertType.INFO,
    label: "Upload Hints",
    dataField: "showUploadHint",
  },
  {
    type: AlertType.INFO,
    label: "Template Hints",
    dataField: "showTemplateHint",
  },
];

const notificationSettingsItems = [
  {
    type: AlertType.SUCCESS,
    label: "Success",
  },
  {
    type: AlertType.ERROR,
    label: "Error",
  },
  {
    type: AlertType.WARN,
    label: "Warning",
  },
  {
    type: AlertType.INFO,
    label: "Info",
  },
  {
    type: AlertType.DRAFT_SAVED,
    label: "Draft Saved",
  },
];

export default function SettingsModal({ visible }: { visible: boolean }) {
  const dispatch = useDispatch();
  const editableSettings = useSelector(getEditableSettings);
  const [settingsDraft, setSettingsDraft] = React.useState<
    Partial<SettingStateBranch>
  >(editableSettings);

  // Reset the draft settings whenever the ones in the store
  // change. This is technically derived state, which should be avoided, but
  // it was the simplest solution in this case.
  React.useEffect(() => {
    setSettingsDraft(editableSettings);
  }, [editableSettings]);

  function changeEnabledNotification(checked: boolean, type: AlertType) {
    setSettingsDraft({
      ...settingsDraft,
      enabledNotifications: {
        ...settingsDraft.enabledNotifications,
        [type]: checked,
      } as EnabledNotifications,
    });
  }

  return (
    <Modal
      closable={false}
      footer={null}
      mask={false}
      onCancel={() => dispatch(updateSettings(settingsDraft))}
      title={<div className={styles.modalHeader}>Settings</div>}
      wrapClassName="settings-modal"
      visible={visible}
    >
      <h3 className={styles.settingsTitle}>Hint Settings</h3>
      <div className={styles.toggleLabel}>Show Hints</div>
      {genericSettingsItems.map(({ dataField, type, label }) => (
        <SettingToggle
          iconType={type}
          isChecked={!!settingsDraft[dataField as "showUploadHint"]}
          key={label}
          label={label}
          onChange={(checked) =>
            setSettingsDraft({ ...settingsDraft, [dataField]: checked })
          }
        />
      ))}
      <hr />
      <h3 className={styles.settingsTitle}>Notification Settings</h3>
      <div className={styles.toggleLabel}>Show in Notification Center</div>
      {notificationSettingsItems.map(({ type, label }) => (
        <SettingToggle
          iconType={type}
          isChecked={!!settingsDraft.enabledNotifications?.[type]}
          key={label}
          label={label}
          onChange={(checked) => changeEnabledNotification(checked, type)}
        />
      ))}
    </Modal>
  );
}

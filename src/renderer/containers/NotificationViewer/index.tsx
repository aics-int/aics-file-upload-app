import { Badge, Icon, Modal } from "antd";
import * as classNames from "classnames";
import * as moment from "moment";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { closeNotificationCenter } from "../../state/feedback/actions";
import { getEventsByNewest } from "../../state/feedback/selectors";
import { selectView } from "../../state/route/actions";
import { getView } from "../../state/route/selectors";
import { AlertType, Page } from "../../state/types";
import NavigationButton from "../NavigationBar/NavigationButton";

import { getFilteredEvents, getUnreadEventsCount } from "./selectors";

const styles = require("./styles.pcss");

const iconPropsLookup = {
  [AlertType.WARN]: {
    type: "warning",
    className: classNames(styles.icon, styles.warn),
  },
  [AlertType.SUCCESS]: {
    type: "check-circle",
    className: classNames(styles.icon, styles.success),
  },
  [AlertType.ERROR]: {
    type: "exclamation-circle",
    className: classNames(styles.icon, styles.error),
  },
  [AlertType.INFO]: {
    type: "info-circle",
    className: classNames(styles.icon, styles.info),
  },
  [AlertType.DRAFT_SAVED]: {
    type: "save",
    className: classNames(styles.icon, styles.save),
  },
};

function getIcon(type: AlertType) {
  return <Icon theme="filled" {...iconPropsLookup[type]} />;
}

function formatDate(date: Date): string {
  return moment(date).format("MM/DD/YYYY [at] HH:mm A");
}

export default function NotificationViewer() {
  const dispatch = useDispatch();

  const filteredEvents = useSelector(getFilteredEvents);
  const allEvents = useSelector(getEventsByNewest);
  const unreadEventsCount = useSelector(getUnreadEventsCount);
  const view = useSelector(getView);

  function renderEventsPage() {
    if (filteredEvents.length > 0) {
      return filteredEvents.map((event) => (
        <div
          key={event.date.toISOString()}
          className={classNames(styles.notificationContainer, {
            [styles.unread]: !event.viewed,
          })}
        >
          <div className={styles.iconContainer}>{getIcon(event.type)}</div>
          <div className={styles.message}>{event.message}</div>
          <div className={styles.timestamp}>{formatDate(event.date)}</div>
        </div>
      ));
    } else if (allEvents.length > 0) {
      return "No notifications matching your settings.";
    } else {
      return "No notifications yet for the current session.";
    }
  }

  const modalHeader = (
    <div className={styles.modalHeader}>
      Notifications
      <Icon
        type="setting"
        theme="filled"
        className={styles.settingsIcon}
        onClick={() => dispatch(selectView(Page.Settings))}
      />
    </div>
  );
  return (
    <>
      <Badge count={unreadEventsCount} offset={[-8, 8]}>
        <NavigationButton
          icon="bell"
          iconTheme="filled"
          isSelected={view === Page.Notifications}
          onSelect={() => dispatch(selectView(Page.Notifications))}
          title="Notifications"
        />
      </Badge>
      <Modal
        title={modalHeader}
        visible={view === Page.Notifications}
        mask={false}
        footer={null}
        onCancel={() => dispatch(closeNotificationCenter())}
        closable={false}
        wrapClassName="notification-modal"
      >
        {renderEventsPage()}
      </Modal>
    </>
  );
}

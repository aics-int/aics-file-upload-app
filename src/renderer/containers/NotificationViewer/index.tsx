import { Badge, Icon, Modal } from "antd";
import classNames from "classnames";
import * as moment from "moment";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import AlertIcon from "../../components/AlertIcon";
import { closeNotificationCenter } from "../../state/feedback/actions";
import { getEventsByNewest } from "../../state/feedback/selectors";
import { selectView } from "../../state/route/actions";
import { Page } from "../../state/types";
import NavigationButton from "../NavigationBar/NavigationButton";

import { getFilteredEvents, getUnreadEventsCount } from "./selectors";

const styles = require("./styles.pcss");

function formatDate(date: Date): string {
  return moment(date).format("MM/DD/YYYY [at] HH:mm A");
}

export default function NotificationViewer({
  isSelected,
}: {
  isSelected: boolean;
}) {
  const dispatch = useDispatch();

  const filteredEvents = useSelector(getFilteredEvents);
  const allEvents = useSelector(getEventsByNewest);
  const unreadEventsCount = useSelector(getUnreadEventsCount);

  function renderEventsPage() {
    if (filteredEvents.length > 0) {
      return filteredEvents.map((event) => (
        <div
          key={event.date.toISOString()}
          className={classNames(styles.notificationContainer, {
            [styles.unread]: !event.viewed,
          })}
        >
          <div className={styles.iconContainer}>
            <AlertIcon type={event.type} />
          </div>
          <div
            className={styles.message}
            dangerouslySetInnerHTML={{ __html: event.message }}
            style={{ userSelect: "text" }}
          />
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
          isSelected={isSelected}
          onSelect={() => dispatch(selectView(Page.Notifications))}
          title="Notifications"
        />
      </Badge>
      <Modal
        title={modalHeader}
        visible={isSelected}
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

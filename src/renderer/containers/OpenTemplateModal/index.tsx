import { Modal } from "antd";
import classNames from "classnames";
import { ipcRenderer } from "electron";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { MainProcessEvents } from "../../../shared/constants";
import TemplateSearch from "../../components/TemplateSearch";
import { closeModal, openModal } from "../../state/feedback/actions";
import { getOpenTemplateModalVisible } from "../../state/feedback/selectors";
import {
  CloseModalAction,
  OpenModalAction,
  OpenTemplateEditorAction,
} from "../../state/feedback/types";
import { openTemplateEditor } from "../../state/selection/actions";
import { State } from "../../state/types";

const styles = require("./styles.pcss");

interface Props {
  className?: string;
  closeModal: ActionCreator<CloseModalAction>;
  openModal: ActionCreator<OpenModalAction>;
  openTemplateEditor: (templateId?: number) => OpenTemplateEditorAction;
  visible: boolean;
}

class OpenTemplateModal extends React.Component<Props, Record<string, any>> {
  public componentDidMount(): void {
    ipcRenderer.on(MainProcessEvents.OPEN_OPEN_TEMPLATE_MODAL, this.openModal);
  }

  public componentWillUnmount(): void {
    ipcRenderer.removeListener(
      MainProcessEvents.OPEN_OPEN_TEMPLATE_MODAL,
      this.openModal
    );
  }

  public render() {
    const { className, visible } = this.props;
    return (
      <Modal
        className={classNames(styles.container, className)}
        onCancel={this.closeModal}
        title="Open Template"
        visible={visible}
      >
        <TemplateSearch
          className={styles.search}
          onSelect={this.openTemplateEditor}
        />
      </Modal>
    );
  }

  private openTemplateEditor = (templateId: number): void => {
    this.props.openTemplateEditor(templateId);
    this.closeModal();
  };

  private closeModal = () => this.props.closeModal("openTemplate");
  private openModal = () => this.props.openModal("openTemplate");
}

function mapStateToProps(state: State) {
  return {
    visible: getOpenTemplateModalVisible(state),
  };
}

const dispatchToPropsMap = {
  closeModal,
  openModal,
  openTemplateEditor,
};

export default connect(mapStateToProps, dispatchToPropsMap)(OpenTemplateModal);

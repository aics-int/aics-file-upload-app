import { Modal } from "antd";
import { isEmpty } from "lodash";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import NewUploadMenu from "../../components/NewUploadMenu";
import { selectView, startNewUpload } from "../../state/route/actions";
import { getPage } from "../../state/route/selectors";
import { uploadWithoutMetadata } from "../../state/upload/actions";

// Used as global modal styles
require("./styles.pcss");

interface Props {
  visible: boolean;
}

/**
 * Component responsible for rendering a modal showing the possible
 * options for uploading with or without a metadata template.
 */
export default function NewUploadModal(props: Props) {
  const dispatch = useDispatch();
  const page = useSelector(getPage);

  function onUploadWithTemplate() {
    dispatch(startNewUpload());
    dispatch(selectView(page));
  }

  function onUploadWithoutTemplate(filePaths: string[], isMultifile: boolean) {
    // If cancel is clicked, this callback gets called and filePaths is undefined
    if (!isEmpty(filePaths)) {
      dispatch(uploadWithoutMetadata(filePaths, isMultifile));
    }
    dispatch(selectView(page));
  }

  return (
    <Modal
      visible={props.visible}
      mask={false}
      footer={null}
      onCancel={() => dispatch(selectView(page))}
      closable={false}
      wrapClassName="new-upload-modal"
      width={225}
    >
      <NewUploadMenu
        onUploadWithTemplate={onUploadWithTemplate}
        onUploadWithoutTemplate={onUploadWithoutTemplate}
      />
    </Modal>
  );
}

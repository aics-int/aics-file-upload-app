import { CheckCircleFilled, CloseCircleFilled } from "@ant-design/icons";
import { Progress, Tooltip } from "antd";
import { expect } from "chai";
import { mount } from "enzyme";
import * as React from "react";

import StatusCell from "..";
import { JSSJobStatus } from "../../../../../services/job-status-service/types";

describe("<StatusCell />", () => {
  it("shows complete status when successful and complete", () => {
    // Arrange
    const row = {
      original: {
        serviceFields: {
          postUploadProcessing: {
            etl: {
              status: JSSJobStatus.SUCCEEDED,
            },
          },
        },
      },
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.SUCCEEDED} {...({} as any)} />
    );

    // Assert
    expect(wrapper.exists(CheckCircleFilled)).to.be.true;
  });

  [JSSJobStatus.FAILED, JSSJobStatus.UNRECOVERABLE].forEach((status) => {
    it(`shows failed status for ${status} upload`, () => {
      // Arrange
      const row = {
        original: {},
      };

      // Act
      const wrapper = mount(
        <StatusCell row={row} value={status} {...({} as any)} />
      );

      // Assert
      expect(wrapper.exists(CloseCircleFilled)).to.be.true;
    });
  });

  it("shows indeterminate status when successful but not complete", () => {
    // Arrange
    const row = {
      original: {},
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.SUCCEEDED} {...({} as any)} />
    );

    // Assert
    expect(wrapper.exists(CheckCircleFilled)).to.be.true;
  });

  it("shows progress and stage of an in progress upload", () => {
    // Arrange
    const row = {
      original: {
        currentStage: "UPLOAD_TO_S3",
        progress: 42,
      },
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.WORKING} {...({} as any)} />
    );

    // Assert
    expect(wrapper.find(Tooltip).prop("title")).to.equal(
      "WORKING - Uploading file"
    );
    expect(wrapper.find(Progress).prop("percent")).to.equal(42);
  });

  it("shows the upload request error in the tooltip", () => {
    // Arrange
    const row = {
      original: {
        serviceFields: {
          uploadRequest: { error: "MMS unavailable" },
        },
      },
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.FAILED} {...({} as any)} />
    );

    // Assert
    expect(wrapper.find(Tooltip).prop("title")).to.equal(
      "FAILED: MMS unavailable"
    );
  });
});

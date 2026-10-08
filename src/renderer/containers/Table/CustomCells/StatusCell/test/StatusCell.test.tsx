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

  it("shows the FSS stage and progress while uploading", () => {
    // Arrange
    const row = {
      original: {
        progress: {
          progress: 60,
          currentStage: "UPLOAD_TO_S3",
        },
      },
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.WORKING} {...({} as any)} />
    );

    // Assert
    expect(wrapper.find(Tooltip).prop("title")).to.equal(
      "WORKING - Step 3 of 4: Uploading file"
    );
    expect(wrapper.find(Progress).prop("percent")).to.equal(60);
  });

  it("counts the FMS cache copy as a step for files kept in local storage", () => {
    // Arrange
    const row = {
      original: {
        serviceFields: {
          files: [{ file: { shouldBeInLocal: true } }],
        },
        progress: {
          progress: 60,
          currentStage: "UPLOAD_TO_S3",
        },
      },
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.WORKING} {...({} as any)} />
    );

    // Assert
    expect(wrapper.find(Tooltip).prop("title")).to.equal(
      "WORKING - Step 4 of 5: Uploading file"
    );
  });

  it("shows no step while waiting to start", () => {
    // Arrange
    const row = {
      original: {
        progress: {
          progress: 0,
          currentStage: "INITIALIZED",
        },
      },
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.WAITING} {...({} as any)} />
    );

    // Assert
    expect(wrapper.find(Tooltip).prop("title")).to.equal(
      "WAITING - Waiting to start"
    );
  });

  it("shows unknown stages as-is", () => {
    // Arrange
    const row = {
      original: {
        progress: {
          progress: 10,
          currentStage: "NEW_STAGE",
        },
      },
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.WORKING} {...({} as any)} />
    );

    // Assert
    expect(wrapper.find(Tooltip).prop("title")).to.equal("WORKING - NEW_STAGE");
  });

  it("shows no progress before FSS has reported any", () => {
    // Arrange
    const row = {
      original: {},
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.WAITING} {...({} as any)} />
    );

    // Assert
    expect(wrapper.find(Tooltip).prop("title")).to.equal("WAITING");
    expect(wrapper.find(Progress).prop("percent")).to.equal(0);
  });
});

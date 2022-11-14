import { CheckCircleFilled, CloseCircleFilled, QuestionCircleFilled } from "@ant-design/icons";
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
    expect(wrapper.exists(QuestionCircleFilled)).to.be.true;
  });

  it("shows step 1 when in first step of upload", () => {
    // Arrange
    const row = {
      original: {
        progress: {
          bytesUploaded: 4245,
          totalBytes: 82341,
        },
      },
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.WORKING} {...({} as any)} />
    );

    // Assert
    expect(wrapper.find(Tooltip).prop("title")).to.equal(
      "WORKING - Step 1 of 2: Uploading file"
    );
    expect(wrapper.find(Progress).prop("percent")).to.equal(5);
  });

  it("shows step 2 when no bytes uploaded", () => {
    // Arrange
    const row = {
      original: {
        progress: {
          bytesUploaded: 0,
          totalBytes: 82341,
        },
      },
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.WORKING} {...({} as any)} />
    );

    // Assert
    expect(wrapper.find(Tooltip).prop("title")).to.equal(
      "WORKING - Step 1 of 2: Uploading file"
    );
    expect(wrapper.find(Progress).prop("percent")).to.equal(0);
  });

  it("shows step 2 when bytes have been uploaded", () => {
    // Arrange
    const row = {
      original: {
        progress: {
          bytesUploaded: 50001,
          totalBytes: 82341,
        },
      },
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.WORKING} {...({} as any)} />
    );

    // Assert
    expect(wrapper.find(Tooltip).prop("title")).to.equal(
      "WORKING - Step 1 of 2: Uploading file"
    );
    expect(wrapper.find(Progress).prop("percent")).to.equal(60);
  });

  it("shows step 3 when in third step of upload", () => {
    // Arrange
    const row = {
      original: {
        progress: {
          bytesUploaded: 82341,
          totalBytes: 82341,
        },
      },
    };

    // Act
    const wrapper = mount(
      <StatusCell row={row} value={JSSJobStatus.WORKING} {...({} as any)} />
    );

    // Assert
    expect(wrapper.find(Tooltip).prop("title")).to.equal(
      "WORKING - Step 2 of 2: Adding metadata"
    );
    expect(wrapper.find(Progress).prop("percent")).to.equal(0);
  });
});

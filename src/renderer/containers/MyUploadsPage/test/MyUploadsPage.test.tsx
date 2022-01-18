import { expect } from "chai";
import { mount } from "enzyme";
import * as React from "react";
import { Provider } from "react-redux";

import MyUploadsPage from "..";
import { createMockReduxStore } from "../../../state/test/configure-mock-store";
import {
  mockFailedUploadJob,
  mockState,
  mockSuccessfulUploadJob,
} from "../../../state/test/mocks";
import { AsyncRequest } from "../../../state/types";

describe("<MyUploadsPage />", () => {
  it("renders spinner while loading data", () => {
    // Arrange
    const { store } = createMockReduxStore({
      ...mockState,
      feedback: {
        ...mockState.feedback,
        requestsInProgress: [AsyncRequest.GET_JOBS],
      },
    });

    // Act
    const wrapper = mount(
      <Provider store={store}>
        <MyUploadsPage />
      </Provider>
    );

    // Assert
    expect(wrapper.find("i.ant-spin-dot-item").exists()).to.be.true;
  });

  it("disables view button when no uploads are selected", () => {
    // Arrange
    const { store } = createMockReduxStore({
      ...mockState,
      feedback: {
        ...mockState.feedback,
        requestsInProgress: [AsyncRequest.GET_JOBS],
      },
      job: {
        ...mockState.job,
        uploadJobs: [mockSuccessfulUploadJob, mockFailedUploadJob],
      },
    });

    // Act
    const wrapper = mount(
      <Provider store={store}>
        <MyUploadsPage />
      </Provider>
    );

    // Assert
    const button = wrapper
      .findWhere((node) => node.text() === "View")
      .first()
      .find("button");
    expect(button.prop("disabled")).to.be.true;
  });

  it("disables retry button when no uploads are selected", () => {
    // Arrange
    const { store } = createMockReduxStore({
      ...mockState,
      feedback: {
        ...mockState.feedback,
        requestsInProgress: [AsyncRequest.GET_JOBS],
      },
      job: {
        ...mockState.job,
        uploadJobs: [mockSuccessfulUploadJob, mockFailedUploadJob],
      },
    });

    // Act
    const wrapper = mount(
      <Provider store={store}>
        <MyUploadsPage />
      </Provider>
    );

    // Assert
    const button = wrapper
      .findWhere((node) => node.text() === "Retry")
      .first()
      .find("button");
    expect(button.prop("disabled")).to.be.true;
  });

  it("disables cancel button when no uploads are selected", () => {
    // Arrange
    const { store } = createMockReduxStore({
      ...mockState,
      feedback: {
        ...mockState.feedback,
        requestsInProgress: [AsyncRequest.GET_JOBS],
      },
      job: {
        ...mockState.job,
        uploadJobs: [mockSuccessfulUploadJob, mockFailedUploadJob],
      },
    });

    // Act
    const wrapper = mount(
      <Provider store={store}>
        <MyUploadsPage />
      </Provider>
    );

    // Assert
    const button = wrapper
      .findWhere((node) => node.text() === "Cancel")
      .first()
      .find("button");
    expect(button.prop("disabled")).to.be.true;
  });
});

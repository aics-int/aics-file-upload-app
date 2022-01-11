import { expect } from "chai";
import { mount } from "enzyme";
import * as React from "react";
import { Provider } from "react-redux";

import TemplateSearch from "..";
import { createMockReduxStore } from "../../../state/test/configure-mock-store";
import { mockState } from "../../../state/test/mocks";

describe("<TemplateSearch />", () => {
  // Removes warning from antd component being tested
  before(() => {
    window.matchMedia = () => ({ 
      addListener: () => {}, 
      removeListener: () => {},
    } as any);
  });

  it("shows template options as given", () => {
    // Arrange
    const templateId = 17;
    const templateName = "My Cool Template";
    const templateNames = ["A", "B", "C", templateName];
    const templates = templateNames.map((Name, TemplateId) => ({
      Name,
      TemplateId,
      Version: 1,
    }));
    templates.push({
      Name: templateName,
      TemplateId: templateId,
      Version: 2,
    });
    const state = {
      ...mockState,
      metadata: {
        ...mockState.metadata,
        templates,
      },
    };
    const { store } = createMockReduxStore(state);

    // Act
    const wrapper = mount(
      <Provider store={store}>
        <TemplateSearch value={templateId} onSelect={() => 1} />
      </Provider>
    );

    // Assert
    expect(wrapper.contains(templateName)).to.be.true;
  });

  it("displays warning when selected template is old version", () => {
    // Arrange
    const templateId = 17;
    const templateName = "My Cool Template";
    const templateNames = ["A", "B", "C", templateName];
    const templates = templateNames.map((Name, TemplateId) => ({
      Name,
      TemplateId,
      Version: 2,
    }));
    templates.push({
      Name: templateName,
      TemplateId: templateId,
      Version: 1,
    });
    const state = {
      ...mockState,
      metadata: {
        ...mockState.metadata,
        templates,
      },
    };
    const { store } = createMockReduxStore(state);

    // Act
    const wrapper = mount(
      <Provider store={store}>
        <TemplateSearch value={templateId} onSelect={() => 1} />
      </Provider>
    );

    // Assert
    expect(wrapper.contains("Newer version of template available")).to.be.true;
  });
});

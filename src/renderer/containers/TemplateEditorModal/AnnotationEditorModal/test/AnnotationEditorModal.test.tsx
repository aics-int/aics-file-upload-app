import { Modal } from "antd";
import { expect } from "chai";
import { mount } from "enzyme";
import { noop } from "lodash";
import * as React from "react";
import { Provider } from "react-redux";
import { createSandbox, createStubInstance, SinonStubbedInstance } from "sinon";

import AnnotationEditorModal from "..";
import { LabkeyClient } from "../../../../services";
import { ColumnType } from "../../../../services/labkey-client/types";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
} from "../../../../state/test/configure-mock-store";
import {
  mockFavoriteColorAnnotation,
  mockState,
} from "../../../../state/test/mocks";

/**
 * This is one of those fun instances where a dependency's dependency has its own bugs.
 *  Check out this page for an explanation as to why we have to add `global.SVGElement = Element`:
 *  https://mlaursen.github.io/react-md-v1-docs/#/discover-more/testing
 * 
 * In short, the issue lies somewhere within rc-resize-observer, which is pulled
 *  in by other dependencies.
 *  - TF 2024-06-14
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
global.SVGElement = Element;

describe("<AnnotationEditorModal />", () => {
  const sandbox = createSandbox();
  let labkeyClient: SinonStubbedInstance<LabkeyClient>;

  before(() => {
    // Removes warning from antd component being tested
    global.cancelAnimationFrame = noop;
  })

  beforeEach(() => {
    labkeyClient = createStubInstance(LabkeyClient);
    sandbox.replace(mockReduxLogicDeps, "labkeyClient", labkeyClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it("shows loading screen while requesting annotation usage", () => {
    // Arrange
    const annotation = {
      ...mockFavoriteColorAnnotation,
      orderIndex: 0,
      required: false,
      annotationTypeName: ColumnType.TEXT,
    };
    const { store } = createMockReduxStore({ ...mockState });

    // Act
    const wrapper = mount(
      <Provider store={store}>
        <AnnotationEditorModal visible annotation={annotation} onClose={noop} />
      </Provider>
    )
      .find(Modal)
      .first();

    // Assert
    expect(wrapper.text()).to.contain("Loading");
  });

  it("disables inputs when annotation is used", async () => {
    // Arrange
    const annotation = {
      ...mockFavoriteColorAnnotation,
      orderIndex: 0,
      required: false,
      annotationTypeName: ColumnType.TEXT,
    };
    const { store, logicMiddleware } = createMockReduxStore({
      ...mockState,
      metadata: {
        ...mockState.metadata,
        annotationIdToHasBeenUsed: {
          [annotation.annotationId]: true,
        },
      },
    });
    labkeyClient.checkForAnnotationValues.resolves(true);

    // Act
    let wrapper = mount(
      <Provider store={store}>
        <AnnotationEditorModal visible annotation={annotation} onClose={noop} />
      </Provider>
    )
      .find(Modal)
      .first();

    // Wait for request for annotation usage to complete
    await logicMiddleware.whenComplete();
    wrapper = wrapper.update();

    // Assert
    expect(wrapper.text()).to.contain("Limited Editing");
    expect(wrapper.text()).to.contain("Annotation Name");
    expect(wrapper.find("input").at(0).prop("disabled")).to.be.true;
    expect(wrapper.text()).to.contain("Description");
    expect(wrapper.find("textarea").prop("disabled")).to.be.undefined;
    expect(wrapper.text()).to.contain("Data Type");
    expect(wrapper.find("input").at(1).prop("disabled")).to.be.true;
  });

  it("enables inputs when annotation is unused", async () => {
    // Arrange
    const annotation = {
      ...mockFavoriteColorAnnotation,
      orderIndex: 0,
      required: false,
      annotationTypeName: ColumnType.DATETIME,
    };
    const { store, logicMiddleware } = createMockReduxStore({
      ...mockState,
      metadata: {
        ...mockState.metadata,
        annotationIdToHasBeenUsed: {
          [annotation.annotationId]: false,
        },
      },
    });
    labkeyClient.checkForAnnotationValues.resolves(false);

    // Act
    let wrapper = mount(
      <Provider store={store}>
        <AnnotationEditorModal visible annotation={annotation} onClose={noop} />
      </Provider>
    )
      .find(Modal)
      .first();

    // Wait for request for annotation usage to complete
    await logicMiddleware.whenComplete();
    wrapper = wrapper.update();

    // Assert
    expect(wrapper.text()).to.not.contain("Limited Editing");
    expect(wrapper.text()).to.contain("Annotation Name");
    expect(wrapper.find("input").at(0).prop("disabled")).to.be.false;
    expect(wrapper.text()).to.contain("Description");
    expect(wrapper.find("textarea").prop("disabled")).to.be.undefined;
    expect(wrapper.text()).to.contain("Data Type");
    expect(wrapper.find("input").at(1).prop("disabled")).to.be.false;
  });

  it("enables inputs when annotation is novel", () => {
    // Arrange
    const { store } = createMockReduxStore({ ...mockState });

    // Act
    const wrapper = mount(
      <Provider store={store}>
        <AnnotationEditorModal visible onClose={noop} />
      </Provider>
    )
      .find(Modal)
      .first();

    // Assert
    expect(wrapper.text()).to.not.contain("Limited Editing");
    expect(wrapper.text()).to.contain("Annotation Name");
    expect(wrapper.find("input").at(0).prop("disabled")).to.be.false;
    expect(wrapper.text()).to.contain("Description");
    expect(wrapper.find("textarea").prop("disabled")).to.be.undefined;
    expect(wrapper.text()).to.contain("Data Type");
    expect(wrapper.find("input").at(1).prop("disabled")).to.be.false;
  });

  it("renders dropdown options input when dropdown type", async () => {
    // Arrange
    const annotation = {
      ...mockFavoriteColorAnnotation,
      orderIndex: 0,
      required: false,
      annotationTypeName: ColumnType.DROPDOWN,
    };
    const { store, logicMiddleware } = createMockReduxStore({ ...mockState });
    labkeyClient.checkForAnnotationValues.resolves(false);

    // Act
    let wrapper = mount(
      <Provider store={store}>
        <AnnotationEditorModal visible annotation={annotation} onClose={noop} />
      </Provider>
    )
      .find(Modal)
      .first();

    // Wait for request for annotation usage to complete
    await logicMiddleware.whenComplete();
    wrapper = wrapper.update();

    // Assert
    expect(wrapper.text()).to.contain("Dropdown Options");
  });

  it("renders lookup input when lookup type", async () => {
    // Arrange
    const annotation = {
      ...mockFavoriteColorAnnotation,
      orderIndex: 0,
      required: false,
      annotationTypeName: ColumnType.LOOKUP,
    };
    const { store, logicMiddleware } = createMockReduxStore({ ...mockState });
    labkeyClient.checkForAnnotationValues.resolves(false);

    // Act
    let wrapper = mount(
      <Provider store={store}>
        <AnnotationEditorModal visible annotation={annotation} onClose={noop} />
      </Provider>
    )
      .find(Modal)
      .first();

    // Wait for request for annotation usage to complete
    await logicMiddleware.whenComplete();
    wrapper = wrapper.update();

    // Assert
    expect(wrapper.text()).to.contain("Lookup Reference");
  });

  it("shows errors when not all fields are completed after attemping save", () => {
    // Arrange
    const { store } = createMockReduxStore({ ...mockState });

    // Act
    let wrapper = mount(
      <Provider store={store}>
        <AnnotationEditorModal visible onClose={noop} />
      </Provider>
    )
      .find(Modal)
      .first();

    // (sanity-check) ensure error icons not present before click
    expect(wrapper.find(".anticon-close-circle")).to.be.lengthOf(0);

    // Attempt save
    wrapper
      .findWhere((node) => node.text() === "Save")
      .first()
      .simulate("click");
    wrapper = wrapper.update();

    // Assert: 3 hoverable error icons should be present
    expect(wrapper.find(".anticon-close-circle")).to.be.lengthOf(3);
  });

  it("renders nothing if not visible", () => {
    // Arrange
    const { store } = createMockReduxStore({ ...mockState });

    // (sanity-check) ensure check works when visible flag is true
    let wrapper = mount(
      <Provider store={store}>
        <AnnotationEditorModal visible onClose={noop} />
      </Provider>
    )
      .find(Modal)
      .first();
    expect(wrapper.text()).to.contain("Annotation");

    // Act
    wrapper = mount(
      <Provider store={store}>
        <AnnotationEditorModal visible={false} onClose={noop} />
      </Provider>
    );

    // Assert
    expect(wrapper.text()).to.be.empty;
  });
});

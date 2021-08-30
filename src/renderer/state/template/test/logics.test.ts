import { expect } from "chai";
import { DropResult } from "react-beautiful-dnd";
import { AnyAction } from "redux";
import {
  createSandbox,
  SinonStub,
  SinonStubbedInstance,
  stub,
  createStubInstance,
} from "sinon";

import { LabkeyClient, MMSClient } from "../../../services";
import { ColumnType } from "../../../services/labkey-client/types";
import { Template } from "../../../services/mms-client/types";
import { requestFailed } from "../../actions";
import { getAlert } from "../../feedback/selectors";
import { receiveMetadata } from "../../metadata/actions";
import { openTemplateEditor } from "../../selection/actions";
import {
  createMockReduxStore,
  dialog,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  mockAnnotationDraft,
  mockAnnotationLookups,
  mockAnnotationOptions,
  mockAnnotations,
  mockAnnotationTypes,
  mockAuditInfo,
  mockFavoriteColorAnnotation,
  mockFavoriteColorTemplateAnnotation,
  mockLookups,
  mockMMSTemplate,
  mockState,
  mockTemplateDraft,
  mockUser,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { AnnotationDraft, AsyncRequest, State } from "../../types";
import {
  addExistingAnnotation,
  addExistingTemplate,
  createAnnotation,
  editAnnotation,
  onTemplateAnnotationDragEnd,
  removeAnnotations,
  saveTemplate,
  saveTemplateSucceeded,
  startTemplateDraft,
  startTemplateDraftFailed,
  updateTemplateDraft,
} from "../actions";
import { ON_TEMPLATE_ANNOTATION_DRAG_END } from "../constants";
import { getTemplateDraft } from "../selectors";

describe("Template Logics", () => {
  const sandbox = createSandbox();
  let mmsClient: SinonStubbedInstance<MMSClient>;
  let labkeyClient: SinonStubbedInstance<LabkeyClient>;

  beforeEach(() => {
    mmsClient = createStubInstance(MMSClient);
    sandbox.replace(mockReduxLogicDeps, "mmsClient", mmsClient);
    labkeyClient = createStubInstance(LabkeyClient);
    sandbox.replace(mockReduxLogicDeps, "labkeyClient", labkeyClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  const startState = {
    ...mockState,
    metadata: {
      ...mockState.metadata,
      annotationLookups: [
        { annotationId: mockFavoriteColorAnnotation.annotationId, lookupId: 1 },
      ],
      annotationTypes: mockAnnotationTypes,
      lookups: mockLookups,
    },
  };

  describe("createAnnotation", () => {
    it("creates annotation & adds to template given OK response", async () => {
      // Arrange
      mmsClient.createAnnotation.resolves(mockFavoriteColorAnnotation);
      labkeyClient.getAnnotations.resolves(mockAnnotations);
      labkeyClient.getAnnotationOptions.resolves(mockAnnotationOptions);
      labkeyClient.getAnnotationLookups.resolves(mockAnnotationLookups);
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...startState,
      });

      // Act
      store.dispatch(createAnnotation(mockFavoriteColorAnnotation));
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          receiveMetadata(
            {
              annotationOptions: mockAnnotationOptions,
              annotations: mockAnnotations,
              annotationLookups: mockAnnotationLookups,
            },
            AsyncRequest.CREATE_ANNOTATION
          )
        )
      ).to.be.true;
      expect(
        actions.includesMatch(
          updateTemplateDraft({
            annotations: [
              {
                ...mockFavoriteColorAnnotation,
                annotationTypeName: ColumnType.TEXT,
                required: false,
                orderIndex: 0,
              },
            ],
          })
        )
      ).to.be.true;
    });

    it("dispatches requestFailed given failed response", async () => {
      // Arrange
      const error = "Failed creation :(";
      mmsClient.createAnnotation.rejects(new Error(error));
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...startState,
      });

      // Act
      store.dispatch(createAnnotation(mockFavoriteColorAnnotation));
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          requestFailed(
            `Could not create annotation: ${error}`,
            AsyncRequest.CREATE_ANNOTATION
          )
        )
      ).to.be.true;
    });
  });

  describe("editAnnotationLogic", () => {
    it("edits given annotation & replaces annotation on template", async () => {
      // Arrange
      mmsClient.editAnnotation.resolves(mockFavoriteColorAnnotation);
      labkeyClient.getAnnotations.resolves(mockAnnotations);
      labkeyClient.getAnnotationOptions.resolves(mockAnnotationOptions);
      labkeyClient.getAnnotationLookups.resolves(mockAnnotationLookups);
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...startState,
        template: {
          draft: {
            ...mockTemplateDraft,
            annotations: [
              {
                ...mockFavoriteColorAnnotation,
                annotationTypeName: ColumnType.BOOLEAN,
                required: false,
                orderIndex: 0,
              },
            ],
          },
          original: mockMMSTemplate,
        },
      });

      // Act
      store.dispatch(
        editAnnotation(
          mockFavoriteColorAnnotation.annotationId,
          mockFavoriteColorAnnotation
        )
      );
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          receiveMetadata(
            {
              annotationOptions: mockAnnotationOptions,
              annotations: mockAnnotations,
              annotationLookups: mockAnnotationLookups,
            },
            AsyncRequest.EDIT_ANNOTATION
          )
        )
      ).to.be.true;
      expect(
        actions.includesMatch(
          updateTemplateDraft({
            annotations: [
              {
                ...mockFavoriteColorAnnotation,
                annotationTypeName: ColumnType.TEXT,
                required: false,
                orderIndex: 0,
              },
            ],
          })
        )
      ).to.be.true;
    });

    it("dispatches requestFailed given failed response", async () => {
      // Arrange
      const error = "Failed edit";
      mmsClient.editAnnotation.rejects(new Error(error));
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...startState,
      });

      // Act
      store.dispatch(editAnnotation(4, mockFavoriteColorAnnotation));
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          requestFailed(
            `Could not edit annotation: ${error}`,
            AsyncRequest.EDIT_ANNOTATION
          )
        )
      ).to.be.true;
    });
  });

  describe("addExistingAnnotationLogic", () => {
    it("adds annotation to draft annotations", () => {
      const { store } = createMockReduxStore({ ...startState });

      let state = store.getState();
      expect(getTemplateDraft(state).annotations.length).to.equal(0);

      store.dispatch(
        addExistingAnnotation({
          ...mockFavoriteColorAnnotation,
          annotationTypeId: 3,
        })
      );

      state = store.getState();
      expect(getTemplateDraft(state).annotations.length).to.equal(1);
    });
    it("sets alert if the annotation type is not recognized", () => {
      const { store } = createMockReduxStore({ ...startState });

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(
        addExistingAnnotation({
          ...mockFavoriteColorAnnotation,
          annotationTypeId: 100,
        })
      );

      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
    });
    it("sets alert if the annotation type is lookup and no annotationlookup junction exists", () => {
      const { store } = createMockReduxStore({
        ...startState,
        metadata: {
          ...startState.metadata,
          annotationLookups: [],
        },
      });

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(
        addExistingAnnotation({
          ...mockFavoriteColorAnnotation,
          annotationTypeId: 6,
        })
      );

      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
    });
    it("sets alert if lookup id is invalid", () => {
      const { store } = createMockReduxStore({
        ...startState,
        metadata: {
          ...startState.metadata,
          lookups: [],
        },
      });

      let state = store.getState();
      expect(getAlert(state)).to.be.undefined;

      store.dispatch(
        addExistingAnnotation({
          ...mockFavoriteColorAnnotation,
          annotationTypeId: 6,
        })
      );

      state = store.getState();
      expect(getAlert(state)).to.not.be.undefined;
    });
  });

  describe("removeAnnotationsLogic", () => {
    it("removes annotations from template draft", () => {
      const { store } = createMockReduxStore({
        ...startState,
        template: {
          ...startState.template,
          draft: {
            annotations: [
              {
                annotationId: 1,
                annotationTypeId: 1,
                annotationTypeName: ColumnType.TEXT,
                orderIndex: 0,
                required: false,
                description: "",
                name: "",
                ...mockAuditInfo,
              },
              {
                annotationId: 2,
                annotationTypeId: 1,
                annotationTypeName: ColumnType.TEXT,
                orderIndex: 1,
                required: false,
                description: "",
                name: "",
                ...mockAuditInfo,
              },
              {
                annotationId: 3,
                annotationTypeId: 1,
                annotationTypeName: ColumnType.TEXT,
                orderIndex: 2,
                required: false,
                description: "",
                name: "",
                ...mockAuditInfo,
              },
            ],
            name: "My template",
          },
        },
      });

      store.dispatch(removeAnnotations([0, 2]));
      expect(getTemplateDraft(store.getState()).annotations).to.be.lengthOf(1);
    });
  });

  describe("onTemplateAnnotationDragEndLogic", () => {
    it("updates template draft", async () => {
      // Arrange
      const annotations: AnnotationDraft[] = [
        "Cell Line",
        "Cas9",
        "Notes",
        "Date",
      ].map((name, index) => ({
        ...mockAnnotationDraft,
        annotationId: index,
        orderIndex: index,
        name,
      }));
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...startState,
        template: {
          ...startState.template,
          draft: {
            annotations: [annotations[3], ...annotations.slice(0, 3)],
            name: "My Template",
          },
        },
      });
      const result: DropResult = {
        draggableId: "unused",
        source: {
          droppableId: "unused",
          index: 0,
        },
        destination: {
          droppableId: "unused",
          index: 3,
        },
        reason: "DROP",
        mode: "FLUID",
        type: "unused",
      };

      // Act
      store.dispatch(onTemplateAnnotationDragEnd(result));
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          updateTemplateDraft({
            annotations,
          })
        )
      ).to.be.true;
    });

    it("does nothing if destination is empty", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...startState,
        template: {
          ...startState.template,
          draft: {
            annotations: [mockAnnotationDraft],
            name: "My Template",
          },
        },
      });
      const result: DropResult = {
        draggableId: "unused",
        source: {
          droppableId: "unused",
          index: 0,
        },
        reason: "DROP",
        mode: "FLUID",
        type: "unused",
      };

      // Act
      store.dispatch(onTemplateAnnotationDragEnd(result));
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch({
          type: ON_TEMPLATE_ANNOTATION_DRAG_END,
        })
      ).to.be.true;
    });
  });

  describe("saveTemplateLogic", () => {
    let originalTemplate: Template;
    let stateWithChangedTemplateDraft: State;
    beforeEach(() => {
      originalTemplate = {
        ...mockMMSTemplate,
        annotations: [
          {
            ...mockAuditInfo,
            annotationId: 1,
            annotationTypeId: 1,
            description: "You know what a color is",
            name: "Color",
            orderIndex: 0,
            required: false,
          },
        ],
      };
      stateWithChangedTemplateDraft = {
        ...startState,
        template: {
          ...startState.template,
          draft: {
            annotations: [mockAnnotationDraft],
            name: "My Template",
            templateId: 1,
          },
          original: originalTemplate,
        },
      };
    });
    const stubMethods = (showMessageBoxOverride?: SinonStub) => {
      const showMessageBoxStub =
        showMessageBoxOverride || stub().resolves({ response: 1 });
      sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);
      mmsClient.editTemplate.resolves(1);
      mmsClient.createTemplate.resolves(1);
      return { showMessageBoxStub };
    };

    it("calls editTemplate endpoint if draft has template id", async () => {
      stubMethods();
      const { logicMiddleware, store } = createMockReduxStore(
        stateWithChangedTemplateDraft
      );

      expect(mmsClient.editTemplate.called).to.be.false;
      store.dispatch(saveTemplate());

      await logicMiddleware.whenComplete();
      expect(mmsClient.editTemplate.called).to.be.true;
    });
    it("calls createTemplate endpoint if draft does not have template id", async () => {
      stubMethods();
      const { logicMiddleware, store } = createMockReduxStore({
        ...startState,
        template: {
          ...startState.template,
          draft: {
            annotations: [mockAnnotationDraft],
            name: "My Template",
          },
        },
      });

      expect(mmsClient.createTemplate.called).to.be.false;
      store.dispatch(saveTemplate());

      await logicMiddleware.whenComplete();
      expect(mmsClient.createTemplate.called).to.be.true;
    });
    it("dispatches requestFailed if saving template fails", async () => {
      const error = "Bad credentials";
      mmsClient.editTemplate.rejects({
        response: {
          data: {
            error,
          },
        },
      });
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...startState,
        template: {
          ...startState.template,
          draft: {
            annotations: [mockAnnotationDraft],
            name: "My Template",
            templateId: 1,
          },
        },
      });

      store.dispatch(saveTemplate());

      await logicMiddleware.whenComplete();
      expect(
        actions.includesMatch(
          requestFailed(
            "Could not save template: Bad credentials",
            AsyncRequest.SAVE_TEMPLATE
          )
        )
      ).to.be.true;
    });
    it("dispatches saveTemplateSucceeded if template was saved successfully", async () => {
      sandbox.replace(
        dialog,
        "showMessageBox",
        stub().resolves({ response: 1 })
      );
      mmsClient.editTemplate.resolves(1);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        stateWithChangedTemplateDraft
      );

      store.dispatch(saveTemplate());
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch(saveTemplateSucceeded(1))).to.be.true;
    });
    it("dispatches requestFailed if booleanAnnotationTypeId is not defined", async () => {
      sandbox.replace(
        dialog,
        "showMessageBox",
        stub().resolves({ response: 1 })
      );
      mmsClient.editTemplate.resolves(1);
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...stateWithChangedTemplateDraft,
        metadata: {
          ...stateWithChangedTemplateDraft.metadata,
          annotationTypes: [],
        },
      });

      store.dispatch(saveTemplate());
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          requestFailed(
            "Could not get boolean annotation type id. Contact Software",
            AsyncRequest.SAVE_TEMPLATE
          )
        )
      );
    });
    it("dispatches requestFailed if getTemplate fails", async () => {
      sandbox.replace(
        dialog,
        "showMessageBox",
        stub().resolves({ response: 1 })
      );
      mmsClient.editTemplate.resolves(1);
      mmsClient.getTemplate.rejects({
        response: {
          data: {
            error: "foo",
          },
        },
      });
      const { actions, logicMiddleware, store } = createMockReduxStore(
        stateWithChangedTemplateDraft
      );

      store.dispatch(saveTemplate());
      await logicMiddleware.whenComplete();
      expect(
        actions.includesMatch(
          requestFailed(
            "Could not retrieve template and update uploads: foo",
            AsyncRequest.GET_TEMPLATE
          )
        )
      );
    });
  });

  describe("addExistingTemplateLogic", () => {
    it("adds annotations from selected template", async () => {
      mmsClient.getTemplate.resolves(mockMMSTemplate);
      const { logicMiddleware, store } = createMockReduxStore(startState);

      let state = store.getState();
      expect(getTemplateDraft(state).annotations.length).to.equal(0);

      store.dispatch(addExistingTemplate(1));
      await logicMiddleware.whenComplete();

      state = store.getState();
      const annotations = getTemplateDraft(state).annotations;
      expect(annotations.length).to.equal(1);
      expect(annotations[0].annotationId).to.equal(1);
      expect(annotations[0].name).to.equal("Favorite Color");
    });

    it("overwrites duplicate annotations with new template's annotations", async () => {
      // Arrange
      mmsClient.getTemplate.resolves(mockMMSTemplate);
      const { logicMiddleware, store } = createMockReduxStore({
        ...startState,
        template: {
          ...startState.template,
          draft: {
            ...mockMMSTemplate,
            annotations: [
              {
                ...mockMMSTemplate.annotations[0],
                annotationTypeName: ColumnType.TEXT,
                required: false,
                orderIndex: 0,
              },
            ],
          },
        },
      });

      // (sanity-check) ensure annotation exists, but was not required before
      let state = store.getState();
      expect(getTemplateDraft(state).annotations.length).to.equal(1);
      let annotations = getTemplateDraft(state).annotations;
      expect(annotations.length).to.equal(1);
      expect(annotations[0].annotationId).to.equal(1);
      expect(annotations[0].name).to.equal("Favorite Color");
      expect(annotations[0].required).to.be.false;

      // Act
      store.dispatch(addExistingTemplate(1));
      await logicMiddleware.whenComplete();

      // Assert
      state = store.getState();
      annotations = getTemplateDraft(state).annotations;
      expect(annotations.length).to.equal(1);
      expect(annotations[0].annotationId).to.equal(1);
      expect(annotations[0].name).to.equal("Favorite Color");
      expect(annotations[0].required).to.be.true;
    });
  });

  describe("openTemplateEditorLogic", () => {
    afterEach(() => {
      mmsClient.getTemplate.restore();
    });

    const runTest = async (expectedAction: AnyAction) => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );
      expect(actions.includesMatch(expectedAction)).to.be.false;

      store.dispatch(openTemplateEditor(1));
      await logicMiddleware.whenComplete();

      // expect(JSON.stringify(actions.list)).to.be.true;
      expect(actions.includesMatch(expectedAction)).to.be.true;
    };

    it("dispatches startTemplateDraft given OK requests", async () => {
      mmsClient.getTemplate.resolves({
        ...mockMMSTemplate,
        createdBy: mockUser.userId,
        modifiedBy: mockUser.userId,
      });
      const expectedTemplate = {
        ...mockMMSTemplate,
        createdBy: mockUser.userId,
        modifiedBy: mockUser.userId,
        createdByDisplayName: mockUser.displayName,
        modifiedByDisplayName: mockUser.displayName,
      };
      const expectedAction = startTemplateDraft(expectedTemplate, {
        ...mockMMSTemplate,
        annotations: [
          {
            ...mockFavoriteColorTemplateAnnotation,
            annotationTypeName: "Text",
            orderIndex: 0,
          },
        ],
        createdBy: mockUser.userId,
        modifiedBy: mockUser.userId,
        createdByDisplayName: mockUser.displayName,
        modifiedByDisplayName: mockUser.displayName,
      });
      await runTest(expectedAction);
    });

    it("dispatches startTemplateDraftFailed if getting template fails", async () => {
      mmsClient.getTemplate.rejects(new Error("foo"));
      const expectedAction = startTemplateDraftFailed(
        "Could not retrieve template: foo"
      );
      await runTest(expectedAction);
    });

    it("dispatches getTemplate without a templateId", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );
      const action = openTemplateEditor();
      store.dispatch(action);
      await logicMiddleware.whenComplete();

      expect(actions.list).to.deep.equal([action]);
    });
  });
});

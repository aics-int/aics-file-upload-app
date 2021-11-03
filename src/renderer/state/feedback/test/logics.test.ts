import { expect } from "chai";
import {
  SinonStubbedInstance,
  createStubInstance,
  createSandbox,
  restore,
} from "sinon";

import ApplicationInfoService from "../../../services/application-info-service";
import LabkeyClient from "../../../services/labkey-client";
import MetadataManagementService from "../../../services/metadata-management-service";
import { DEFAULT_TEMPLATE_DRAFT } from "../../template/constants";
import { getTemplateDraft } from "../../template/selectors";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import { mockState, mockTemplateStateBranch } from "../../test/mocks";
import { AlertType, State } from "../../types";
import { checkForUpdate, closeModal } from "../actions";
import { SET_ALERT } from "../constants";
import { getTemplateEditorVisible } from "../selectors";

describe("Feedback logics", () => {
  let mmsClient: SinonStubbedInstance<MetadataManagementService>,
    labkeyClient: SinonStubbedInstance<LabkeyClient>,
    applicationInfoService: SinonStubbedInstance<ApplicationInfoService>;
  const sandbox = createSandbox();

  beforeEach(() => {
    mmsClient = createStubInstance(MetadataManagementService);
    labkeyClient = createStubInstance(LabkeyClient);
    applicationInfoService = createStubInstance(ApplicationInfoService);
    sandbox.replace(mockReduxLogicDeps, "mmsClient", mmsClient);
    sandbox.replace(mockReduxLogicDeps, "labkeyClient", labkeyClient);
    sandbox.replace(
      mockReduxLogicDeps,
      "applicationInfoService",
      applicationInfoService
    );
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe("checkForUpdateLogic", () => {
    const currentVersion = "1.5.2";
    const OLD_ENV = process.env;

    beforeEach(() => {
      process.env = { ...OLD_ENV }; // Make a copy
      process.env.APPLICATION_VERSION = currentVersion;
    });

    afterEach(() => {
      process.env = OLD_ENV; // Restore old environment
      restore();
    });

    it("display info alert when newer version found", async () => {
      // Arrange
      const { logicMiddleware, store, actions } = createMockReduxStore({
        ...mockState,
      });
      applicationInfoService.getNewestApplicationVersion.resolves("v2.0.0");

      // Act
      store.dispatch(checkForUpdate());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch({
          payload: {
            type: AlertType.INFO,
          },
          type: SET_ALERT,
        })
      ).to.be.true;
    });

    it("display no alerts when version is current", async () => {
      // Arrange
      const { logicMiddleware, store, actions } = createMockReduxStore({
        ...mockState,
      });
      applicationInfoService.getNewestApplicationVersion.resolves(
        currentVersion
      );

      // Act
      store.dispatch(checkForUpdate());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch({
          payload: {
            type: AlertType.INFO,
          },
          type: SET_ALERT,
        })
      ).to.be.false;
      expect(
        actions.includesMatch({
          payload: {
            type: AlertType.ERROR,
          },
          type: SET_ALERT,
        })
      ).to.be.false;
    });

    it("display no alerts when newest released version is older than current", async () => {
      // Arrange
      const { logicMiddleware, store, actions } = createMockReduxStore({
        ...mockState,
      });
      applicationInfoService.getNewestApplicationVersion.resolves("v1.4.7");

      // Act
      store.dispatch(checkForUpdate());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch({
          payload: {
            type: AlertType.INFO,
          },
          type: SET_ALERT,
        })
      ).to.be.false;
      expect(
        actions.includesMatch({
          payload: {
            type: AlertType.ERROR,
          },
          type: SET_ALERT,
        })
      ).to.be.false;
    });

    it("displays error alert when unable to retrieve update info", async () => {
      // Arrange
      const { logicMiddleware, store, actions } = createMockReduxStore({
        ...mockState,
      });
      applicationInfoService.getNewestApplicationVersion.rejects(
        new Error("test")
      );

      // Act
      store.dispatch(checkForUpdate());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch({
          payload: {
            type: AlertType.ERROR,
          },
          type: SET_ALERT,
        })
      ).to.be.true;
    });
  });

  describe("closeModalLogic", () => {
    const templateEditorOpenState: State = {
      ...mockState,
      feedback: {
        ...mockState.feedback,
        visibleModals: ["templateEditor"],
      },
      template: {
        ...mockTemplateStateBranch,
        draft: {
          annotations: [],
          name: "My Template",
        },
      },
    };
    it("sets templateEditor visibility to false when modal name is templateEditor", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...templateEditorOpenState,
      });
      // before
      expect(getTemplateEditorVisible(store.getState())).to.be.true;

      // apply
      store.dispatch(closeModal("templateEditor"));
      await logicMiddleware.whenComplete();

      // after
      expect(getTemplateEditorVisible(store.getState())).to.be.false;
    });
    it("clears template draft state when templateEditor modal is closed", async () => {
      const { logicMiddleware, store } = createMockReduxStore({
        ...templateEditorOpenState,
      });
      // before
      expect(getTemplateDraft(store.getState())).to.not.equal(
        DEFAULT_TEMPLATE_DRAFT
      );

      // apply
      store.dispatch(closeModal("templateEditor"));
      await logicMiddleware.whenComplete();

      // after
      expect(getTemplateDraft(store.getState())).to.deep.equal(
        DEFAULT_TEMPLATE_DRAFT
      );
    });
  });
});

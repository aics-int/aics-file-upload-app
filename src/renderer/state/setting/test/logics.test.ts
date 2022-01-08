import { expect } from "chai";
import { Store } from "redux";
import {
  createStubInstance,
  SinonStubbedInstance,
  stub,
  replace,
  restore,
} from "sinon";

import { LabkeyClient } from "../../../services";
import EnvironmentAwareStorage from "../../EnvironmentAwareStorage";
import { setAlert } from "../../feedback/actions";
import { getAlert } from "../../feedback/selectors";
import { requestMetadata } from "../../metadata/actions";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import { mockState } from "../../test/mocks";
import { AlertType } from "../../types";
import {
  gatherSettings,
  openEnvironmentDialog,
  updateSettings,
} from "../actions";
import { updateSettingsLogic } from "../logics";
import {
  getLimsHost,
  getShowTemplateHint,
  getShowUploadHint,
  getTemplateId,
} from "../selectors";

describe("Setting logics", () => {
  const localhost = "localhost";
  const stagingHost = "staging";
  let labkeyClient: SinonStubbedInstance<LabkeyClient>;
  let storage: SinonStubbedInstance<EnvironmentAwareStorage>;

  beforeEach(() => {
    labkeyClient = createStubInstance(LabkeyClient);
    storage = createStubInstance(EnvironmentAwareStorage);
    // Stub `get` specifically, since it is a class property and not on the prototype
    storage.get = stub();
    replace(mockReduxLogicDeps, "storage", storage);
    replace(mockReduxLogicDeps, "labkeyClient", labkeyClient);
  });

  afterEach(() => {
    restore();
  });

  describe("updateSettingsLogic", () => {
    let store: Store;

    beforeEach(() => {
      ({ store } = createMockReduxStore(
        mockState,
        undefined,
        // Provide only the logic we are testing so we avoid running all the
        // logics that could be triggered by these tests.
        [updateSettingsLogic],
        undefined
      ));
    });

    it("updates settings if data persisted correctly", () => {
      // before
      expect(getLimsHost(store.getState())).to.equal(localhost);

      // apply
      store.dispatch(updateSettings({ limsHost: stagingHost }));

      // after
      expect(getLimsHost(store.getState())).to.equal(stagingHost);
    });

    it("sets template id in settings", () => {
      expect(getTemplateId(store.getState())).to.be.undefined;

      store.dispatch(updateSettings({ templateId: 3 }));

      expect(getTemplateId(store.getState())).to.equal(3);
    });

    it("sets whether to show the upload hint in settings", () => {
      expect(getShowUploadHint(store.getState())).to.be.true;

      store.dispatch(updateSettings({ showUploadHint: false }));

      expect(getShowUploadHint(store.getState())).to.be.false;
    });

    it("sets whether to show the template hint in settings", () => {
      const { store } = createMockReduxStore({
        ...mockState,
        setting: {
          ...mockState.setting,
        },
      });

      expect(getShowTemplateHint(store.getState())).to.be.true;

      store.dispatch(updateSettings({ showTemplateHint: false }));

      expect(getShowTemplateHint(store.getState())).to.be.false;
    });

    it("Doesn't retrieve metadata if neither host or port changed", () => {
      const { actions } = createMockReduxStore(mockState, undefined, [
        updateSettingsLogic,
      ]);
      store.dispatch(updateSettings({ showUploadHint: true }));
      expect(actions.includesMatch(requestMetadata())).to.be.false;
    });

    it("updates settings in memory and sets warning alert if data persistence failure", () => {
      storage.set.throwsException();
      const { store } = createMockReduxStore(mockState, undefined, [
        updateSettingsLogic,
      ]);

      // before
      expect(getLimsHost(store.getState())).to.equal(localhost);

      // apply
      store.dispatch(updateSettings({ limsHost: stagingHost }));

      // after
      expect(getLimsHost(store.getState())).to.equal(stagingHost);
      expect(getAlert(store.getState())).to.not.be.undefined;
    });
  });

  describe("openEnvironmentDialogLogic", () => {
    it("updates settings in storage and reloads the app", async () => {
      // Arrange
      const storageMock = createStubInstance(EnvironmentAwareStorage);

      const ipcRenderer = {
        on: stub(),
        send: stub(),
        invoke: stub(),
      }
      ipcRenderer.invoke.resolves(1);
      const mockDeps = {
        ...mockReduxLogicDeps,
        ipcRenderer,
        storage: storageMock,
      }
      const { actions, logicMiddleware, store } = createMockReduxStore(
        undefined,
        mockDeps
      );

      // Act
      store.dispatch(openEnvironmentDialog());
      await logicMiddleware.whenComplete();

      // Assert
      expect(ipcRenderer.invoke).to.have.been.calledOnce;
      // `set` will be called once for each key of the LIMS URL settings
      expect(storageMock.set).to.have.been.calledThrice;
      expect(ipcRenderer.send).to.have.been.calledOnce;
      expect(actions.list).to.deep.equal([openEnvironmentDialog()]);
    });

    it("encounters an error when persisting user settings", async () => {
      // Arrange
      const dialogMock = {
        showMessageBox: stub().resolves({ response: 1 }),
        showOpenDialog: stub(),
        showSaveDialog: stub(),
      };

      const storageMock = createStubInstance(EnvironmentAwareStorage);
      storageMock.set.throws(new Error("Problem persisting settings!"));

      const mockDeps = {
        ...mockReduxLogicDeps,
        dialog: dialogMock,
        storage: storageMock,
      }

      mockDeps.ipcRenderer.invoke.resolves(1);

      const { actions, logicMiddleware, store } = createMockReduxStore(
        undefined,
        mockDeps
      );

      // Act
      store.dispatch(openEnvironmentDialog());
      await logicMiddleware.whenComplete();

      // Assert
      expect(actions.list).to.deep.equal([
        openEnvironmentDialog(),
        setAlert({
          message: "Failed to persist settings",
          type: AlertType.WARN,
        }),
      ]);
    });
  });

  describe("gatherSettingsLogic", () => {
    it("doesn't do anything if no settings stored", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore();
      store.dispatch(gatherSettings());

      await logicMiddleware.whenComplete();

      expect(actions.includesMatch(gatherSettings())).to.be.false;
    });
    it("updates settings to what is saved in storage and doesn't set alert", async () => {
      storage.get
        .onFirstCall()
        .returns({
          limsHost: stagingHost,
        })
        .onSecondCall()
        .returns(1);

      labkeyClient.getTemplates.resolves(
        [1, 2, 3].map((id) => ({
          TemplateId: id,
          Version: id,
          Name: "My Cool Template",
        }))
      );

      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // before
      expect(getLimsHost(store.getState())).to.equal(localhost);
      expect(getTemplateId(store.getState())).to.be.undefined;

      // apply
      store.dispatch(gatherSettings());
      await logicMiddleware.whenComplete();

      // after
      expect(getAlert(store.getState())).to.be.undefined;
      expect(getLimsHost(store.getState())).to.equal(stagingHost);
      expect(getTemplateId(store.getState())).to.equal(3);
    });

    it("sets alert if error in getting storage settings", async () => {
      storage.get.throwsException();
      const { logicMiddleware, store } = createMockReduxStore(mockState);

      // apply
      store.dispatch(gatherSettings());
      await logicMiddleware.whenComplete();

      // after
      expect(getLimsHost(store.getState())).to.equal(localhost);
      expect(getAlert(store.getState())).to.not.be.undefined;
    });
  });
});

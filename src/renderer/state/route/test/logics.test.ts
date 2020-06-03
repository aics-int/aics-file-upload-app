import { expect } from "chai";
import { ActionCreator } from "redux";
import { createSandbox, SinonStub, stub } from "sinon";

import {
  getSelectionHistory,
  getTemplateHistory,
  getUploadHistory,
} from "../../metadata/selectors";
import {
  selectFile,
  selectWorkflowPath,
  selectWorkflows,
} from "../../selection/actions";
import { getCurrentSelectionIndex } from "../../selection/selectors";
import {
  createMockReduxStore,
  dialog,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import { mockSelectedWorkflows, mockState } from "../../test/mocks";
import { Logger } from "../../types";
import { associateFilesAndWorkflows } from "../../upload/actions";
import { getCurrentUploadIndex } from "../../upload/selectors";
import { closeUploadTab, goBack, selectPage } from "../actions";
import { setSwitchEnvEnabled } from "../logics";
import { getPage, getView } from "../selectors";
import { Page } from "../types";
import Menu = Electron.Menu;

describe("Route logics", () => {
  const sandbox = createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  describe("setSwitchEnvEnabled", () => {
    let switchEnv: { enabled: boolean; label: string };
    let fileMenu: {
      label: string;
      submenu: { items: Array<{ enabled: boolean; label: string }> };
    };
    let menu: Menu;
    let logger: Logger;
    const logError: SinonStub = stub();

    beforeEach(() => {
      logger = ({
        error: logError,
      } as any) as Logger;
      switchEnv = {
        enabled: true,
        label: "Switch Environment",
      };
      fileMenu = {
        label: "file",
        submenu: {
          items: [switchEnv],
        },
      };
      menu = ({
        items: [fileMenu],
      } as any) as Menu;
    });

    it("logs error if file menu not found", () => {
      stub(fileMenu, "label").value("Edit");
      setSwitchEnvEnabled(menu, false, logger);
      expect(switchEnv.enabled).to.be.true;
      expect(logError.called).to.be.true;
    });
    it("logs error if file submenu not found", () => {
      stub(fileMenu, "submenu").value(undefined);
      setSwitchEnvEnabled(menu, false, logger);
      expect(switchEnv.enabled).to.be.true;
      expect(logError.called).to.be.true;
    });
    it("logs error if Switch Environment menu option not found", () => {
      stub(fileMenu, "submenu").value({ items: [] });
      setSwitchEnvEnabled(menu, false, logger);
      expect(switchEnv.enabled).to.be.true;
      expect(logError.called).to.be.true;
    });
    it("sets Switch Environment menu option to enabled if enabled=true", () => {
      stub(switchEnv, "enabled").value(false);
      expect(switchEnv.enabled).to.be.false;
      setSwitchEnvEnabled(menu, true, logger);
      expect(switchEnv.enabled).to.be.true;
    });
    it("sets Switch Environment menu option to disabled if enabled=false", () => {
      stub(switchEnv, "enabled").value(true);
      expect(switchEnv.enabled).to.be.true;
      setSwitchEnvEnabled(menu, false, logger);
      expect(switchEnv.enabled).to.be.false;
    });
  });

  describe("selectPageLogic", () => {
    let switchEnv: { enabled: boolean; label: string };
    let fileMenu: {
      label: string;
      submenu: { items: Array<{ enabled: boolean; label: string }> };
    };
    let menu: Menu;

    beforeEach(() => {
      switchEnv = {
        enabled: true,
        label: "Switch Environment",
      };
      fileMenu = {
        label: "file",
        submenu: {
          items: [switchEnv],
        },
      };
      menu = ({
        items: [fileMenu],
      } as any) as Menu;
      const getApplicationMenuStub = stub().returns(menu);
      sandbox.replace(
        mockReduxLogicDeps,
        "getApplicationMenu",
        getApplicationMenuStub
      );
    });

    // This is going forward
    it(
      "Going from DragAndDrop to SelectUploadType should record the index selection/template/upload state " +
        "branches were at after leaving that page",
      async () => {
        const { logicMiddleware, store } = createMockReduxStore({
          ...mockState,
          route: {
            page: Page.DragAndDrop,
            view: Page.DragAndDrop,
          },
        });

        // before
        let state = store.getState();
        expect(getSelectionHistory(state)).to.be.empty;
        expect(getTemplateHistory(state)).to.be.empty;
        expect(getUploadHistory(state)).to.be.empty;
        expect(getPage(state)).to.equal(Page.DragAndDrop);
        expect(switchEnv.enabled).to.be.true;

        // apply
        store.dispatch(selectPage(Page.DragAndDrop, Page.SelectUploadType));

        // after
        await logicMiddleware.whenComplete();
        state = store.getState();
        expect(getSelectionHistory(state)[Page.DragAndDrop]).to.equal(0);
        expect(getTemplateHistory(state)[Page.DragAndDrop]).to.equal(0);
        expect(getUploadHistory(state)[Page.DragAndDrop]).to.equal(0);
        expect(getPage(state)).to.equal(Page.SelectUploadType);
        expect(switchEnv.enabled).to.be.false;
      }
    );
    it(
      "Going from SelectUploadType to AssociateFiles should record which index selection/template/upload state " +
        "branches are at for the page we went to",
      async () => {
        const startingSelectionHistory = {
          [Page.SelectUploadType]: 0,
        };
        const startingTemplateHistory = {
          [Page.SelectUploadType]: 0,
        };
        const startingUploadHistory = {
          [Page.SelectUploadType]: 0,
        };
        const { logicMiddleware, store } = createMockReduxStore({
          ...mockState,
          metadata: {
            ...mockState.metadata,
            history: {
              selection: startingSelectionHistory,
              template: startingTemplateHistory,
              upload: startingUploadHistory,
            },
          },
          route: {
            page: Page.SelectUploadType,
            view: Page.SelectUploadType,
          },
        });
        let state = store.getState();
        expect(getSelectionHistory(state)).to.equal(startingSelectionHistory);
        expect(getTemplateHistory(state)).to.equal(startingTemplateHistory);
        expect(getUploadHistory(state)).to.equal(startingUploadHistory);

        store.dispatch(selectWorkflowPath());
        await logicMiddleware.whenComplete();

        // before
        expect(getCurrentSelectionIndex(store.getState())).to.be.equal(2);
        expect(switchEnv.enabled).to.be.false;

        // apply
        store.dispatch(selectPage(Page.SelectUploadType, Page.AssociateFiles));

        // after
        await logicMiddleware.whenComplete();
        state = store.getState();
        expect(getSelectionHistory(state)).to.deep.equal({
          ...startingSelectionHistory,
          [Page.SelectUploadType]: 2,
        });
        expect(getTemplateHistory(state)).to.deep.equal({
          ...startingTemplateHistory,
          [Page.SelectUploadType]: 0,
        });
        expect(getUploadHistory(state)).to.deep.equal({
          ...startingUploadHistory,
          [Page.SelectUploadType]: 0,
        });
        expect(getPage(state)).to.equal(Page.AssociateFiles);
        expect(switchEnv.enabled).to.be.false;
      }
    );
    it(
      "Going from SelectUploadType to DragAndDrop should change indexes for selection/template/upload to 0" +
        "back to where they were when the user left the DragAndDrop page",
      async () => {
        const startingSelectionHistory = {
          [Page.DragAndDrop]: 0,
        };
        const startingTemplateHistory = {
          [Page.DragAndDrop]: 0,
        };
        const startingUploadHistory = {
          [Page.DragAndDrop]: 0,
        };
        const { logicMiddleware, store } = createMockReduxStore({
          ...mockState,
          metadata: {
            ...mockState.metadata,
            history: {
              selection: startingSelectionHistory,
              template: startingTemplateHistory,
              upload: startingUploadHistory,
            },
          },
          route: {
            page: Page.SelectUploadType,
            view: Page.SelectUploadType,
          },
        });
        store.dispatch(selectWorkflowPath());
        await logicMiddleware.whenComplete();

        // before
        expect(getCurrentSelectionIndex(store.getState())).to.be.equal(2);
        expect(switchEnv.enabled).to.be.false;

        // apply
        store.dispatch(selectPage(Page.SelectUploadType, Page.DragAndDrop));

        // after
        await logicMiddleware.whenComplete();
        const state = store.getState();
        expect(getCurrentSelectionIndex(state)).to.equal(0);
        expect(getPage(state)).to.equal(Page.DragAndDrop);
        expect(switchEnv.enabled).to.be.true;
      }
    );
    it("Going to UploadSummary page should clear all upload information", async () => {
      const startingSelectionHistory = {
        [Page.DragAndDrop]: 0,
      };
      const startingTemplateHistory = {
        [Page.DragAndDrop]: 0,
      };
      const startingUploadHistory = {
        [Page.DragAndDrop]: 0,
      };
      const { logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          history: {
            selection: startingSelectionHistory,
            template: startingTemplateHistory,
            upload: startingUploadHistory,
          },
        },
        route: {
          page: Page.AssociateFiles,
          view: Page.AssociateFiles,
        },
      });
      store.dispatch(selectWorkflows(mockSelectedWorkflows));
      store.dispatch(selectFile("/path/to/file"));
      store.dispatch(
        associateFilesAndWorkflows(["/path/to/file"], mockSelectedWorkflows)
      );
      await logicMiddleware.whenComplete();

      // before
      expect(getCurrentSelectionIndex(store.getState())).to.be.greaterThan(1);
      expect(getCurrentUploadIndex(store.getState())).to.be.greaterThan(0);
      expect(switchEnv.enabled).to.be.true;

      store.dispatch(selectPage(Page.SelectUploadType, Page.UploadSummary));
      await logicMiddleware.whenComplete();

      const state = store.getState();
      // we dispatching the closeUploadTab action after clearing history
      expect(getCurrentSelectionIndex(state)).to.not.be.greaterThan(1);
      expect(getCurrentUploadIndex(store.getState())).to.not.be.greaterThan(1);
      expect(switchEnv.enabled).to.be.true;
    });
  });

  /**
   * helper function for go back and closeUploadTab logic tests
   * @param startPage the page we start on
   * @param expectedEndPage the page we expect to end at,
   * @param action action creator to dispatch
   * @param respondOKToDialog whether or not the user says OK to the dialog asking them if it's okay to lose their
   * changes and go back
   */
  const runShowMessageBoxTest = async (
    startPage: Page,
    expectedEndPage: Page,
    action: ActionCreator<any>,
    respondOKToDialog = true
  ) => {
    const response = respondOKToDialog ? 1 : 0;
    const showMessageBoxStub = stub().resolves({ response });
    sandbox.replace(dialog, "showMessageBox", showMessageBoxStub);
    const { logicMiddleware, store } = createMockReduxStore({
      ...mockState,
      route: {
        page: startPage,
        view: startPage,
      },
    });

    expect(getPage(store.getState())).to.equal(startPage);
    expect(getView(store.getState())).to.equal(startPage);

    store.dispatch(action());

    await logicMiddleware.whenComplete();
    expect(getPage(store.getState())).to.equal(expectedEndPage);
    expect(getView(store.getState())).to.equal(expectedEndPage);
  };

  describe("goBackLogic", () => {
    it("goes to SelectStorageIntent page if going back from AddCustomData page", async () => {
      await runShowMessageBoxTest(
        Page.AddCustomData,
        Page.SelectStorageLocation,
        goBack
      );
    });
    it("goes to AssociateFiles page if going back from SelectStorageLocation page", async () => {
      await runShowMessageBoxTest(
        Page.SelectStorageLocation,
        Page.AssociateFiles,
        goBack
      );
    });
    it("goes to SelectUploadType page if going back from AssociateFiles page", async () => {
      await runShowMessageBoxTest(
        Page.AssociateFiles,
        Page.SelectUploadType,
        goBack
      );
    });
    it("goes to DragAndDrop page if going back from SelectUploadType page", async () => {
      await runShowMessageBoxTest(
        Page.SelectUploadType,
        Page.DragAndDrop,
        goBack
      );
    });
    it("goes to UploadSummary page if going back from DragAndDrop page", async () => {
      await runShowMessageBoxTest(Page.DragAndDrop, Page.UploadSummary, goBack);
    });
    it("does not change pages if user cancels the action through the dialog", async () => {
      await runShowMessageBoxTest(
        Page.SelectUploadType,
        Page.SelectUploadType,
        goBack,
        false
      );
    });
  });

  describe("closeUploadTabLogic", () => {
    it("goes to UploadSummary page given Yes from dialog", async () => {
      await runShowMessageBoxTest(
        Page.AssociateFiles,
        Page.UploadSummary,
        closeUploadTab
      );
    });
    it("stays on current page given Cancel from dialog", async () => {
      await runShowMessageBoxTest(
        Page.AssociateFiles,
        Page.AssociateFiles,
        closeUploadTab,
        false
      );
    });
  });
});

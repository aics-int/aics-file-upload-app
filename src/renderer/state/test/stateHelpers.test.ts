import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import {
  createStubInstance,
  SinonStub,
  stub,
  replace,
  restore,
  SinonStubbedInstance,
} from "sinon";

import MetadataManagementService from "../../services/metadata-management-service";
import { Template } from "../../services/metadata-management-service/types";
import { setSuccessAlert, setWarningAlert } from "../feedback/actions";
import {
  ensureDraftGetsSaved,
  getApplyTemplateInfo,
  getWithRetry,
} from "../stateHelpers";
import { ReduxLogicTransformDependencies, UploadStateBranch } from "../types";

import { mockReduxLogicDeps } from "./configure-mock-store";
import {
  mockBooleanAnnotation,
  mockFavoriteColorTemplateAnnotation,
  mockMMSTemplate,
  mockNumberAnnotation,
} from "./mocks";

describe("State helpers", () => {
  afterEach(() => {
    restore();
  });

  describe("getWithRetry", () => {
    let requestStub: SinonStub;
    let dispatchStub: SinonStub;
    const mockCannotFindAddressError = Object.freeze({
      code: "ENOTFOUND",
      config: {},
      message: "getaddrinfo ENOTFOUND stg-aics.corp.alleninstitute.org",
      name: "Error",
    });
    beforeEach(() => {
      requestStub = stub();
      dispatchStub = stub();
      const setTimeoutStub = stub().callsArg(0) as any as typeof setTimeout;
      replace(global, "setTimeout", setTimeoutStub);
    });

    it("does not retry if response is OK", async () => {
      const resp = {};
      requestStub.resolves(resp);
      const result = await getWithRetry(requestStub, dispatchStub);
      expect(dispatchStub.called).to.be.false;
      expect(requestStub.callCount).to.equal(1);
      expect(result).to.equal(resp);
    });
    it("throws error if response is not OK", () => {
      requestStub.rejects(new Error("foo"));
      return expect(getWithRetry(requestStub, dispatchStub)).to.be.rejectedWith(
        Error
      );
    });
    it("does not retry if response is not Bad Gateway or VPN error", async () => {
      requestStub.rejects(new Error("foo"));
      try {
        await getWithRetry(requestStub, dispatchStub);
      } catch (e) {
        expect(dispatchStub.called).to.be.false;
        expect(requestStub.callCount).to.equal(1);
      }
    });
    it("retries if response is Bad Gateway", async () => {
      const response = {};
      requestStub
        .onFirstCall()
        .callsFake(() => {
          return Promise.reject({
            response: {
              status: 502,
            },
          });
        })
        .onSecondCall()
        .resolves(response);

      const resp = await getWithRetry(requestStub, dispatchStub);

      expect(
        dispatchStub.calledWithMatch(
          setWarningAlert(
            "Could not contact server. Make sure services are running."
          )
        )
      ).to.be.true;
      expect(dispatchStub.calledWithMatch(setSuccessAlert("Success!"))).to.be
        .true;
      expect(requestStub.callCount).to.equal(2);
      expect(resp).to.equal(response);
    });
    it("retries if response is VPN error", async function () {
      const response = {};
      requestStub
        .onFirstCall()
        .callsFake(() => {
          return Promise.reject(mockCannotFindAddressError);
        })
        .onSecondCall()
        .resolves(response);

      const resp = await getWithRetry(requestStub, dispatchStub);
      expect(
        dispatchStub.calledWithMatch(
          setWarningAlert("Services might be down. Retrying request...")
        )
      ).to.be.true;
      expect(dispatchStub.calledWithMatch(setSuccessAlert("Success!"))).to.be
        .true;
      expect(requestStub.callCount).to.equal(2);
      expect(resp).to.equal(response);
    });
    it("stops retrying after 5 tries", async () => {
      requestStub.rejects(mockCannotFindAddressError);
      try {
        await getWithRetry(requestStub, dispatchStub);
      } catch (e) {
        expect(requestStub.callCount).to.equal(5);
      }
    });
  });

  describe("getApplyTemplateInfo", () => {
    let uploads: UploadStateBranch;
    let previouslyAppliedTemplate: Template;
    const file = "/path/to/file1";
    const template = {
      ...mockMMSTemplate,
      annotations: [
        mockFavoriteColorTemplateAnnotation,
        mockBooleanAnnotation,
        mockNumberAnnotation,
      ],
    };
    let mmsClient: SinonStubbedInstance<MetadataManagementService>;

    beforeEach(() => {
      mmsClient = createStubInstance(MetadataManagementService);
      uploads = {
        [file]: {
          Age: 16,
          "Favorite Color": "red",
          barcode: "1234",
          file,
          key: file,
          shouldBeInArchive: true,
          shouldBeInLocal: true,
          wellIds: [1],
        },
      };
      previouslyAppliedTemplate = {
        ...mockMMSTemplate,
        annotations: [
          mockFavoriteColorTemplateAnnotation,
          { ...mockNumberAnnotation, name: "Age" },
        ],
      };
    });

    it("throws error if getTemplate request fails", () => {
      mmsClient.getTemplate.rejects(new Error("Oops"));
      return expect(
        getApplyTemplateInfo(
          1,
          mmsClient as any as MetadataManagementService,
          stub(),
          mockBooleanAnnotation.annotationTypeId,
          uploads,
          previouslyAppliedTemplate
        )
      ).to.be.rejectedWith(Error);
    });
    it("returns setAppliedTemplate action with template returned from MMS and expected upload", async () => {
      mmsClient.getTemplate.resolves(template);
      const { template: resultTemplate, uploads: uploadsResult } =
        await getApplyTemplateInfo(
          1,
          mmsClient as any as MetadataManagementService,
          stub(),
          mockBooleanAnnotation.annotationTypeId,
          uploads,
          previouslyAppliedTemplate
        );
      expect(resultTemplate).to.deep.equal(template);
      // the Age annotation goes away since it's not part of the applied template
      expect(uploadsResult).to.deep.equal({
        [file]: {
          // This annotation got added and is initialized as undefined
          "Clone Number Garbage": [],
          // this stays here because it is part of the template and does not get cleared out
          "Favorite Color": "red",
          // This annotation got added
          Qc: [false],
          barcode: "1234",
          file: "/path/to/file1",
          key: file,
          shouldBeInArchive: true,
          shouldBeInLocal: true,
          wellIds: [1],
        },
      });
    });
  });

  describe("ensureDraftGetsSaved", () => {
    const testDir = path.resolve(os.tmpdir(), "stateHelpersTest");

    before(async () => {
      await fs.promises.mkdir(testDir);
    })

    after(async () => {
      await fs.promises.rm(testDir, { recursive: true });
    })

    const runTest = async (
      skipWarningDialog: boolean,
      showMessageBoxResponse?: number,
      currentUploadFilePath?: string,
      saveFilePath?: string
    ) => {
      const ipcRenderer = {
        invoke: stub(),
      }
      const deps = {
        ...mockReduxLogicDeps,
        ipcRenderer,
        getState: () => ({}),
      };


      if (!skipWarningDialog) {
        ipcRenderer.invoke.onCall(0).resolves(showMessageBoxResponse);
        ipcRenderer.invoke.onCall(1).resolves(saveFilePath);
      } else {
        ipcRenderer.invoke.onCall(0).resolves(saveFilePath);
      }

      const result = await ensureDraftGetsSaved(
        deps as any as ReduxLogicTransformDependencies,
        true,
        currentUploadFilePath,
        skipWarningDialog
      );
      return { result, invokeStub: ipcRenderer.invoke as SinonStub };
    };

    it("automatically saves draft if user is working on a draft that has previously been saved", async () => {
      const { invokeStub } =
        await runTest(false, undefined, path.resolve(testDir, "testDraft"));
      expect(invokeStub).to.not.have.been.called;
    });

    it("shows warning dialog if skipWarningDialog is false", async () => {
      const { invokeStub } = await runTest(false);
      expect(invokeStub).to.have.been.calledOnce;
    });

    it("does not show warning dialog if skipWarningDialog is true and opens save dialog", async () => {
      const { invokeStub } = await runTest(true);
      expect(invokeStub).to.have.been.calledOnce;
    });

    it("returns { cancelled: false, filePath: undefined } if user chooses to discard draft", async () => {
      const { result, invokeStub } = await runTest(
        false,
        1 // discard button index
      );
      expect(invokeStub).to.have.been.calledOnce;
      expect(result).to.deep.equal({
        cancelled: false,
        filePath: undefined,
      });
    });

    it("shows saveDialog and returns { cancelled: false, filePath } with filePath chosen by user", async () => {
      const filePath = path.resolve(testDir, "testDraftSaves");
      const { result, invokeStub } =
        await runTest(
          false,
          2, // save button index
          undefined,
          filePath
        );
      expect(invokeStub).to.have.been.calledTwice;
      expect(result).to.deep.equal({
        cancelled: false,
        filePath,
      });
    });

    it("shows saveDialog and returns { cancelled: false, filePath: undefined } if user decides to cancel saving draft", async () => {
      const { result, invokeStub } =
        await runTest(
          false,
          2, // save button index
          undefined,
          undefined
        );
      expect(invokeStub).to.have.been.calledTwice;
      expect(result).to.deep.equal({
        cancelled: false,
        filePath: undefined,
      });
    });

    it("returns { cancelled: true, filePath: undefined } if user clicks Cancel in warning dialog", async () => {
      const { result, invokeStub } = await runTest(
        false,
        0 // cancel button index
      );
      expect(invokeStub).to.have.been.calledOnce;
      expect(result).to.deep.equal({
        cancelled: true,
        filePath: undefined,
      });
    });
  });
});

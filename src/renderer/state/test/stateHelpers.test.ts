import { expect } from "chai";
import {
  createStubInstance,
  SinonStub,
  stub,
  replace,
  restore,
  SinonStubbedInstance,
} from "sinon";

import MMSClient from "../../services/mms-client";
import { Template } from "../../services/mms-client/types";
import { setSuccessAlert, setWarningAlert } from "../feedback/actions";
import {
  ensureDraftGetsSaved,
  getApplyTemplateInfo,
  getWithRetry,
} from "../stateHelpers";
import { ReduxLogicTransformDependencies, UploadStateBranch } from "../types";
import { getUploadRowKey } from "../upload/constants";

import { dialog, mockReduxLogicDeps } from "./configure-mock-store";
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
      const setTimeoutStub = (stub().callsArg(0) as any) as typeof setTimeout;
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
    const key = getUploadRowKey({ file: "/path/to/file1" });
    const template = {
      ...mockMMSTemplate,
      annotations: [
        mockFavoriteColorTemplateAnnotation,
        mockBooleanAnnotation,
        mockNumberAnnotation,
      ],
    };
    let mmsClient: SinonStubbedInstance<MMSClient>;

    beforeEach(() => {
      mmsClient = createStubInstance(MMSClient);
      uploads = {
        [key]: {
          Age: 16,
          "Favorite Color": "red",
          barcode: "1234",
          file: "/path/to/file1",
          key: getUploadRowKey({ file: "/path/to/file" }),
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
          (mmsClient as any) as MMSClient,
          stub(),
          mockBooleanAnnotation.annotationTypeId,
          uploads,
          previouslyAppliedTemplate
        )
      ).to.be.rejectedWith(Error);
    });
    it("returns setAppliedTemplate action with template returned from MMS and expected upload", async () => {
      mmsClient.getTemplate.resolves(template);
      const {
        template: resultTemplate,
        uploads: uploadsResult,
      } = await getApplyTemplateInfo(
        1,
        (mmsClient as any) as MMSClient,
        stub(),
        mockBooleanAnnotation.annotationTypeId,
        uploads,
        previouslyAppliedTemplate
      );
      expect(resultTemplate).to.deep.equal(template);
      // the Age annotation goes away since it's not part of the applied template
      expect(uploadsResult).to.deep.equal({
        [key]: {
          // This annotation got added and is initialized as undefined
          "Clone Number Garbage": [],
          // this stays here because it is part of the template and does not get cleared out
          "Favorite Color": "red",
          // This annotation got added
          Qc: [false],
          barcode: "1234",
          file: "/path/to/file1",
          key: getUploadRowKey({ file: "/path/to/file" }),
          shouldBeInArchive: true,
          shouldBeInLocal: true,
          wellIds: [1],
        },
      });
    });
  });

  describe("ensureDraftGetsSaved", () => {
    const runTest = async (
      skipWarningDialog: boolean,
      showMessageBoxResponse?: number,
      currentUploadFilePath?: string,
      saveFilePath?: string
    ) => {
      const writeFileStub = stub();
      const showMessageBoxStub = stub().resolves({
        response: showMessageBoxResponse,
      });
      replace(dialog, "showMessageBox", showMessageBoxStub);
      const showSaveDialogStub = stub().resolves({ filePath: saveFilePath });
      replace(dialog, "showSaveDialog", showSaveDialogStub);
      const deps = ({
        ...mockReduxLogicDeps,
        getState: () => ({}),
        writeFile: writeFileStub,
      } as any) as ReduxLogicTransformDependencies;

      const result = await ensureDraftGetsSaved(
        deps,
        true,
        currentUploadFilePath,
        skipWarningDialog
      );
      return { result, showMessageBoxStub, showSaveDialogStub, writeFileStub };
    };
    it("automatically saves draft if user is working on a draft that has previously been saved", async () => {
      const {
        showMessageBoxStub,
        showSaveDialogStub,
        writeFileStub,
      } = await runTest(false, undefined, "/foo");
      expect(writeFileStub.called).to.be.true;
      expect(showMessageBoxStub.called).to.be.false;
      expect(showSaveDialogStub.called).to.be.false;
    });
    it("shows warning dialog if skipWarningDialog is false", async () => {
      const { showMessageBoxStub } = await runTest(false);
      expect(showMessageBoxStub.called).to.be.true;
    });
    it("does not show warning dialog if skipWarningDialog is true and opens save dialog", async () => {
      const { showMessageBoxStub, showSaveDialogStub } = await runTest(true);
      expect(showMessageBoxStub.called).to.be.false;
      expect(showSaveDialogStub.called).to.be.true;
    });
    it("returns { cancelled: false, filePath: undefined } if user chooses to discard draft", async () => {
      const { result, showMessageBoxStub, showSaveDialogStub } = await runTest(
        false,
        1 // discard button index
      );
      expect(showMessageBoxStub.called).to.be.true;
      expect(showSaveDialogStub.called).to.be.false;
      expect(result).to.deep.equal({
        cancelled: false,
        filePath: undefined,
      });
    });
    it("shows saveDialog and returns { cancelled: false, filePath } with filePath chosen by user", async () => {
      const filePath = "/foo";
      const {
        result,
        showMessageBoxStub,
        showSaveDialogStub,
        writeFileStub,
      } = await runTest(
        false,
        2, // save button index
        undefined,
        filePath
      );
      expect(showMessageBoxStub.called).to.be.true;
      expect(showSaveDialogStub.called).to.be.true;
      expect(writeFileStub.called).to.be.true;
      expect(result).to.deep.equal({
        cancelled: false,
        filePath,
      });
    });
    it("shows saveDialog and returns { cancelled: false, filePath: undefined } if user decides to cancel saving draft", async () => {
      const {
        result,
        showMessageBoxStub,
        showSaveDialogStub,
        writeFileStub,
      } = await runTest(
        false,
        2, // save button index
        undefined,
        undefined
      );
      expect(showMessageBoxStub.called).to.be.true;
      expect(showSaveDialogStub.called).to.be.true;
      expect(writeFileStub.called).to.be.false;
      expect(result).to.deep.equal({
        cancelled: false,
        filePath: undefined,
      });
    });
    it("returns { cancelled: true, filePath: undefined } if user clicks Cancel in warning dialog", async () => {
      const { result, showMessageBoxStub, showSaveDialogStub } = await runTest(
        false,
        0 // cancel button index
      );
      expect(showMessageBoxStub.called).to.be.true;
      expect(showSaveDialogStub.called).to.be.false;
      expect(result).to.deep.equal({
        cancelled: true,
        filePath: undefined,
      });
    });
  });
});

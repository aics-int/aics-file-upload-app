import { expect } from "chai";
import { AnyAction } from "redux";
import {
  createSandbox,
  SinonStub,
  SinonStubbedInstance,
  stub,
  createStubInstance,
} from "sinon";

import { AnnotationName } from "../../../constants";
import FileManagementSystem from "../../../services/file-management-system";
import LabkeyClient from "../../../services/labkey-client";
import {
  LabkeyPlateResponse,
  LabkeyTemplate,
  ScalarType,
  AnnotationOption,
} from "../../../services/labkey-client/types";
import MetadataManagementService from "../../../services/metadata-management-service";
import { requestFailed } from "../../actions";
import { SET_ALERT } from "../../feedback/constants";
import {
  createMockReduxStore,
  ipcRenderer,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  mockAnnotationLookups,
  mockAnnotationOptions,
  mockAnnotations,
  mockAnnotationTypes,
  mockAuditInfo,
  mockBarcodePrefixes,
  mockImagingSessions,
  mockLookupOptions,
  mockLookups,
  mockState,
  mockUnit,
  mockUser,
  mockWellAnnotation,
} from "../../test/mocks";
import { AsyncRequest } from "../../types";
import {
  createBarcode,
  receiveAnnotationUsage,
  receiveMetadata,
  requestAnnotationUsage,
  requestBarcodeSearchResults,
  requestMetadata,
  requestTemplates,
  retrieveOptionsForLookup,
  requestProgramOptions, 
  receiveProgramOptions,
} from "../actions";
import { getBarcodeSearchResults } from "../selectors";

describe("Metadata logics", () => {
  const sandbox = createSandbox();
  const prefix = Object.freeze({
    description: "some prefix",
    prefixId: 1,
    prefix: "AD",
  });

  let fms: SinonStubbedInstance<FileManagementSystem>;
  let labkeyClient: SinonStubbedInstance<LabkeyClient>;
  let mmsClient: SinonStubbedInstance<MetadataManagementService>;

  beforeEach(() => {
    fms = createStubInstance(FileManagementSystem);
    labkeyClient = createStubInstance(LabkeyClient);
    mmsClient = createStubInstance(MetadataManagementService);
    sandbox.replace(mockReduxLogicDeps, "fms", fms);
    sandbox.replace(mockReduxLogicDeps, "labkeyClient", labkeyClient);
    sandbox.replace(mockReduxLogicDeps, "mmsClient", mmsClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  const runRequestFailedTest = async (
    actionToDispatch: AnyAction,
    error: string,
    requestType: AsyncRequest | string,
    state = mockState
  ) => {
    const { actions, logicMiddleware, store } = createMockReduxStore(state);
    store.dispatch(actionToDispatch);
    await logicMiddleware.whenComplete();

    expect(actions.includesMatch(requestFailed(error, requestType))).to.be.true;
  };

  const runRequestSucceededTest = async (
    actionToDispatch: AnyAction,
    expectedAction: AnyAction,
    state = mockState
  ) => {
    const { actions, logicMiddleware, store } = createMockReduxStore(state);
    expect(actions.includesMatch(expectedAction)).to.be.false;

    store.dispatch(actionToDispatch);

    await logicMiddleware.whenComplete();
    expect(actions.includesMatch(expectedAction)).to.be.true;
  };

  describe("createBarcodeLogic", () => {
    let sendStub: SinonStub;

    beforeEach(() => {
      sendStub = stub();
      sandbox.replace(ipcRenderer, "send", sendStub);
    });

    it("sends a event on the OPEN_CREATE_PLATE_STANDALONE channel if it successfully creates a barcode", async () => {
      mmsClient.createBarcode.resolves("fake");
      const { logicMiddleware, store } = createMockReduxStore();
      store.dispatch(createBarcode(prefix, "key"));
      await logicMiddleware.whenComplete();

      expect(sendStub.called).to.be.true;
    });

    it("dispatches setAlert if request fails", async () => {
      mmsClient.createBarcode.rejects(new Error("foo"));
      const { actions, logicMiddleware, store } = createMockReduxStore();
      store.dispatch(createBarcode(prefix, "key"));
      await logicMiddleware.whenComplete();

      expect(sendStub.called).to.be.false;
      expect(
        actions.includesMatch({
          type: SET_ALERT,
        })
      ).to.be.true;
    });
  });
  describe("requestMetadata", () => {
    it("sets metadata given OK response", async () => {
      labkeyClient.getAnnotations.resolves(mockAnnotations);
      labkeyClient.getAnnotationOptions.resolves(mockAnnotationOptions);
      labkeyClient.getAnnotationLookups.resolves(mockAnnotationLookups);
      labkeyClient.getAnnotationTypes.resolves(mockAnnotationTypes);
      labkeyClient.getBarcodePrefixes.resolves(mockBarcodePrefixes);
      labkeyClient.getImagingSessions.resolves(mockImagingSessions);
      labkeyClient.getLookups.resolves(mockLookups);
      labkeyClient.getUnits.resolves([mockUnit]);
      labkeyClient.getUsers.resolves([mockUser]);

      const expectedAction = receiveMetadata({
        annotations: mockAnnotations,
        annotationOptions: mockAnnotationOptions,
        annotationLookups: mockAnnotationLookups,
        annotationTypes: mockAnnotationTypes,
        barcodePrefixes: mockBarcodePrefixes,
        imagingSessions: mockImagingSessions,
        lookups: mockLookups,
        units: [mockUnit],
        users: [mockUser],
      });
      await runRequestSucceededTest(requestMetadata(), expectedAction);
    });
    it("dispatches requestFailed given non-OK response", async () => {
      labkeyClient.getImagingSessions.rejects(new Error("foo"));
      await runRequestFailedTest(
        requestMetadata(),
        "Failed to retrieve metadata: foo",
        AsyncRequest.GET_METADATA
      );
    });
  });

  describe("requestAnnotationUsageLogic", () => {
    it("sets annotation as has been used", async () => {
      const annotationId = 17;
      labkeyClient.checkForAnnotationValues.resolves(true);
      await runRequestSucceededTest(
        requestAnnotationUsage(annotationId),
        receiveAnnotationUsage(annotationId, true)
      );
    });

    it("fails request on error", async () => {
      const error = "foo";
      labkeyClient.checkForAnnotationValues.rejects(new Error(error));
      await runRequestFailedTest(
        requestAnnotationUsage(6),
        `Failed to determine if annotation has been used: ${error}`,
        AsyncRequest.REQUEST_ANNOTATION_USAGE
      );
    });
  });

  describe("requestTemplates", () => {
    it("sets templates given OK response", async () => {
      const templates: LabkeyTemplate[] = [];
      labkeyClient.getTemplates.resolves([]);
      await runRequestSucceededTest(
        requestTemplates(),
        receiveMetadata({ templates }, AsyncRequest.GET_TEMPLATES)
      );
    });
    it("dispatches requestFailed given non-ok response", async () => {
      labkeyClient.getTemplates.rejects(new Error("foo"));
      await runRequestFailedTest(
        requestTemplates(),
        "Could not retrieve templates: foo",
        AsyncRequest.GET_TEMPLATES
      );
    });
  });
  describe("requestOptionsForLookup", () => {
    const mockStateWithAnnotations = {
      ...mockState,
      metadata: {
        ...mockState.metadata,
        annotationLookups: [
          { annotationId: mockWellAnnotation.annotationId, lookupId: 1 },
        ],
        annotations: [mockWellAnnotation],
        lookups: [
          {
            ...mockAuditInfo,
            columnName: "wellId",
            descriptionColumn: "description",
            lookupId: 1,
            schemaName: "microscopy",
            tableName: "well",
            "scalarTypeId/Name": ScalarType.INT,
          },
        ],
      },
    };
    it("sets lookupOptions given OK response", async () => {
      labkeyClient.getOptionsForLookup.resolves(mockLookupOptions);
      await runRequestSucceededTest(
        retrieveOptionsForLookup(AnnotationName.WELL),
        receiveMetadata(
          { Well: mockLookupOptions },
          AsyncRequest.GET_OPTIONS_FOR_LOOKUP
        ),
        mockStateWithAnnotations
      );
    });
    it("dispatches requestFailed given not OK response", async () => {
      labkeyClient.getOptionsForLookup.rejects(new Error("foo"));
      await runRequestFailedTest(
        retrieveOptionsForLookup("Well"),
        "Could not retrieve options for lookup annotation: foo",
        AsyncRequest.GET_OPTIONS_FOR_LOOKUP,
        mockStateWithAnnotations
      );
    });
    it("dispatches requestFailed if annotation's lookup not found", async () => {
      labkeyClient.getOptionsForLookup.resolves([]);
      await runRequestFailedTest(
        retrieveOptionsForLookup("Well"),
        "Could not retrieve options for lookup: could not find lookup. Contact Software.",
        AsyncRequest.GET_OPTIONS_FOR_LOOKUP,
        {
          ...mockStateWithAnnotations,
          metadata: {
            ...mockStateWithAnnotations.metadata,
            lookups: [],
          },
        }
      );
    });
  });
  describe("getBarcodeSearchResults", () => {
    it("dispatches receiveMetadata given good request", async () => {
      const barcodeSearchResults: LabkeyPlateResponse[] = [];
      labkeyClient.getPlatesByBarcode.resolves(barcodeSearchResults);
      const expectedAction = receiveMetadata(
        { barcodeSearchResults },
        AsyncRequest.GET_BARCODE_SEARCH_RESULTS
      );
      await runRequestSucceededTest(
        requestBarcodeSearchResults("35"),
        expectedAction
      );
    });
    it("dispatches requestFailed given bad request", async () => {
      labkeyClient.getPlatesByBarcode.rejects(new Error("foo"));
      await runRequestFailedTest(
        requestBarcodeSearchResults("35"),
        "Could not retrieve barcode search results: foo",
        AsyncRequest.GET_BARCODE_SEARCH_RESULTS
      );
    });
    it("doesn't request data if payload is empty", async () => {
      labkeyClient.getPlatesByBarcode.rejects();
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        mockReduxLogicDeps
      );

      // before
      expect(getBarcodeSearchResults(store.getState())).to.be.empty;
      expect(labkeyClient.getPlatesByBarcode.called).to.be.false;

      // apply
      store.dispatch(requestBarcodeSearchResults("  "));
      await logicMiddleware.whenComplete();

      // after
      expect(getBarcodeSearchResults(store.getState())).to.be.empty;
      expect(labkeyClient.getPlatesByBarcode.called).to.be.false;
    });
  });
  describe("requestProgramOptions", () => {
    it("dispatches receiveProgramOptions given OK response", async () => {
      const fakeOptions: AnnotationOption[] = [
        { annotationOptionId: 1, annotationId: 153, value: "Variance" },
        { annotationOptionId: 2, annotationId: 153, value: "EMT" },
      ];
  
      labkeyClient.getProgramOptions.resolves(fakeOptions);
  
      await runRequestSucceededTest(
        requestProgramOptions(),
        receiveProgramOptions(fakeOptions)
      );
    });
  
    it("dispatches requestFailed given error", async () => {
      labkeyClient.getProgramOptions.rejects(new Error("backend boom"));
  
      await runRequestFailedTest(
        requestProgramOptions(),
        "Could not retrieve program options: backend boom",
        AsyncRequest.GET_PROGRAM_OPTIONS
      );
    });
  });
});

import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { expect } from "chai";
import * as moment from "moment";
import {
  createSandbox,
  createStubInstance,
  SinonStubbedInstance,
} from "sinon";

import { AnnotationName } from "../../../constants";
import {
  FileManagementSystem,
  JobStatusService,
  LabkeyClient,
  MetadataManagementService,
} from "../../../services";
import { UploadJob } from "../../../services/job-status-service/types";
import { ColumnType } from "../../../services/labkey-client/types";
import { requestFailed } from "../../actions";
import { SET_ALERT } from "../../feedback/constants";
import { setPlateBarcodeToPlates } from "../../metadata/actions";
import { SET_PLATE_BARCODE_TO_PLATES } from "../../metadata/constants";
import { getPlateBarcodeToPlates } from "../../metadata/selectors";
import { resetUpload } from "../../route/actions";
import { setAppliedTemplate } from "../../template/actions";
import {
  createMockReduxStore,
  mockReduxLogicDeps,
} from "../../test/configure-mock-store";
import {
  getMockStateWithHistory,
  mockAnnotationTypes,
  mockAuditInfo,
  mockDateAnnotation,
  mockDateTimeAnnotation,
  mockFailedUploadJob,
  mockJob,
  mockMMSTemplate,
  mockNumberAnnotation,
  mockState,
  mockSuccessfulUploadJob,
  mockTemplateStateBranch,
  mockTemplateWithManyValues,
  mockTextAnnotation,
  mockWellUpload,
  nonEmptyStateForInitiatingUpload,
} from "../../test/mocks";
import { AsyncRequest, FileModel, Page, State } from "../../types";
import {
  addUploadFiles,
  applyTemplate,
  cancelUploads,
  cancelUploadFailed,
  cancelUploadSucceeded,
  editFileMetadataFailed,
  initiateUpload,
  initiateUploadFailed,
  openUploadDraft,
  retryUploads,
  saveUploadDraft,
  saveUploadDraftSuccess,
  submitFileMetadataUpdate,
  updateUpload,
  updateUploadRows,
  uploadFailed,
  uploadWithoutMetadata,
} from "../actions";
import {
  INITIATE_UPLOAD,
  INITIATE_UPLOAD_SUCCEEDED,
  REPLACE_UPLOAD,
  SAVE_UPLOAD_DRAFT_SUCCESS,
  UPLOAD_FAILED,
  UPLOAD_SUCCEEDED,
} from "../constants";
import uploadLogics from "../logics";
import {
  getUpload,
  getUploadFileNames,
} from "../selectors";

describe("Upload logics", () => {
  const sandbox = createSandbox();
  let fms: SinonStubbedInstance<FileManagementSystem>;
  let jssClient: SinonStubbedInstance<JobStatusService>;
  let mmsClient: SinonStubbedInstance<MetadataManagementService>;
  let labkeyClient: SinonStubbedInstance<LabkeyClient>;
  const testDir = path.resolve(os.tmpdir(), "uploadUnitTest");

  before(async () => {
    await fs.promises.mkdir(testDir);
  })

  beforeEach(() => {
    fms = createStubInstance(FileManagementSystem);
    jssClient = createStubInstance(JobStatusService);
    mmsClient = createStubInstance(MetadataManagementService);
    labkeyClient = createStubInstance(LabkeyClient);
    sandbox.replace(mockReduxLogicDeps, "fms", fms);
    sandbox.replace(mockReduxLogicDeps, "jssClient", jssClient);
    sandbox.replace(mockReduxLogicDeps, "mmsClient", mmsClient);
    sandbox.replace(mockReduxLogicDeps, "labkeyClient", labkeyClient);
  });

  afterEach(() => {
    sandbox.restore();
  });

  after(async () => {
    await fs.promises.rm(testDir, { recursive: true });
  })

  describe("applyTemplateLogic", () => {
    it("dispatches requestFailed if booleanAnnotationTypeId not defined", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore();
      store.dispatch(applyTemplate(1));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          requestFailed(
            "Boolean annotation type id not found. Contact Software.",
            AsyncRequest.GET_TEMPLATE
          )
        )
      ).to.be.true;
    });
    it("dispatches requestFailed if getTemplate fails", async () => {
      mmsClient.getTemplate.rejects({
        response: {
          data: {
            error: "foo",
          },
        },
      });
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload
      );

      store.dispatch(applyTemplate(1));
      await logicMiddleware.whenComplete();
      expect(
        actions.includesMatch(
          requestFailed(
            "Could not apply template: foo",
            AsyncRequest.GET_TEMPLATE
          )
        )
      ).to.be.true;
    });
    it("calls getTemplate using templateId provided", async () => {
      mmsClient.getTemplate.resolves(mockMMSTemplate);
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        upload: getMockStateWithHistory({
          "/path/to/file1": {
            file: "/path/to/file1",
            [AnnotationName.WELL]: [1],
          },
        }),
      });
      const expectedAction = setAppliedTemplate(mockMMSTemplate, {
        "/path/to/file1": {
          ["Favorite Color"]: [],
          file: "/path/to/file1",
          [AnnotationName.WELL]: [1],
        },
      });

      // before
      expect(actions.includesMatch(expectedAction)).to.be.false;

      // apply
      store.dispatch(applyTemplate(1));
      await logicMiddleware.whenComplete();

      // after
      expect(actions.includesMatch(expectedAction)).to.be.true;
    });
  });

  describe("initiateUploadLogic", () => {
    const jobId = "abcd";
    const initiatedUpload: UploadJob = {
      ...mockJob,
      jobId,
    };

    it("adds job name to action payload, dispatches initiateUploadSucceeded", async () => {
      fms.initiateUpload.resolves(initiatedUpload);
      jssClient.existsById.resolves(true);
      const { actions, logicMiddleware, store } = createMockReduxStore(
        {
          ...nonEmptyStateForInitiatingUpload,
          route: {
            page: Page.UploadWithTemplate,
            view: Page.UploadWithTemplate,
          },
          setting: {
            ...nonEmptyStateForInitiatingUpload.setting,
            username: "foo",
          },
        },
        undefined,
        uploadLogics
      );
      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();
      expect(
        actions.includesMatch({
          autoSave: true,
          type: INITIATE_UPLOAD,
        })
      ).to.be.true;
      expect(actions.list.find((a) => a.type === INITIATE_UPLOAD_SUCCEEDED)).to
        .not.be.undefined;
      // Assert that each upload used the same groupId
      const groupIds = new Set(
        fms.initiateUpload.getCalls().map((call) => call.args[2]?.groupId)
      );
      expect(groupIds).to.be.lengthOf(1);
      expect(groupIds).to.not.be.lengthOf(fms.initiateUpload.callCount);
    });

    it("properly marks files with expected multifile extensions as multifiles", async () => {
      fms.initiateUpload.resolves(initiatedUpload);
      jssClient.existsById.resolves(true);
      const { actions, logicMiddleware, store } = createMockReduxStore(
          {
            ...nonEmptyStateForInitiatingUpload,
            route: {
              page: Page.UploadWithTemplate,
              view: Page.UploadWithTemplate,
            },
            setting: {
              ...nonEmptyStateForInitiatingUpload.setting,
              username: "foo",
            },
          },
          undefined,
          uploadLogics
      );
      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();
      expect(
          actions.includesMatch({
            autoSave: true,
            type: INITIATE_UPLOAD,
          })
      ).to.be.true;
      expect(actions.list.find((a) => a.type === INITIATE_UPLOAD_SUCCEEDED)).to
          .not.be.undefined;

      // Assert that each upload had the expected "multifile" value
      // Files 1 through 3 are "standard", Files 4 through 5 are multifiles.
      // So we'll expect 3 "false" values and 2 "true" values.
      const multifileValues = fms.initiateUpload.getCalls().map(
          (call) => call.args[2]?.multifile);
      const multifileFalseValues = multifileValues.filter(val => val === false);
      const multifileTrueValues = multifileValues.filter(val => val === true);
      expect(multifileFalseValues).to.have.length(3);
      expect(multifileTrueValues).to.have.length(2);
    });

    it("sets error alert given validation error", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        undefined,
        uploadLogics
      );
      const fileNames = getUploadFileNames(
        nonEmptyStateForInitiatingUpload
      ).join(", ");
      const error = "test failure";
      fms.initiateUpload.rejects(new Error(error));

      // Act
      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          initiateUploadFailed(
            fileNames,
            `Something went wrong while initiating the upload. Details: ${error}`
          )
        )
      ).to.be.true;
    });

    it("does not continue upload given upload directory request failure", async () => {
      fms.initiateUpload.rejects(new Error("foo"));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        undefined,
        uploadLogics
      );

      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();

      expect(actions.includesMatch({ type: INITIATE_UPLOAD_SUCCEEDED })).to.be
        .false;
      expect(actions.includesMatch({ type: UPLOAD_FAILED })).to.be.false;
      expect(actions.includesMatch({ type: UPLOAD_SUCCEEDED })).to.be.false;
    });

    it("initiates upload given OK response from validateMetadataAndGetUploadDirectory", async () => {
      fms.initiateUpload.resolves(initiatedUpload);
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        undefined,
        uploadLogics
      );
      jssClient.existsById.resolves(true);
      // before
      expect(fms.upload.called).to.be.false;

      // apply
      store.dispatch(initiateUpload());

      // after
      await logicMiddleware.whenComplete();
      expect(fms.upload.called).to.be.true;
    });

    it("dispatches uploadFailed if fms.upload fails error", async () => {
      // Arrange
      fms.initiateUpload.resolves(initiatedUpload);
      jssClient.existsById.resolves(true);
      const errorMessage = "uploadFile failed";
      fms.upload.rejects(new Error(errorMessage));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        mockReduxLogicDeps,
        uploadLogics
      );

      // Act
      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          uploadFailed(
            `Something went wrong while uploading your files. Details: ${errorMessage}`,
            initiatedUpload.jobName
          )
        )
      ).to.be.true;
    });

    it("resets upload state after initiate is complete", async () => {
      // Arrange
      fms.initiateUpload.resolves(initiatedUpload);
      jssClient.existsById.resolves(true);
      const errorMessage = "uploadFile failed";
      fms.upload.rejects(new Error(errorMessage));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        mockReduxLogicDeps,
        uploadLogics
      );

      // Act
      store.dispatch(initiateUpload());
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          resetUpload()
        )
      ).to.be.true;
    })
  });
  describe("retryUploadsLogic", () => {
    it("calls fms.retry if no missing info on job", async () => {
      const { logicMiddleware, store } = createMockReduxStore(
        mockState,
        undefined,
        uploadLogics
      );

      const uploadJob = {
        ...mockFailedUploadJob,
        jobName: "bar",
      };
      store.dispatch(retryUploads([uploadJob]));
      await logicMiddleware.whenComplete();

      expect(fms.retry.called).to.be.true;
    });
    it("dispatches uploadFailed fms.retry throws exception", async () => {
      fms.retry.rejects(new Error("error"));
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockState,
        undefined,
        uploadLogics
      );

      const uploadJob = {
        ...mockFailedUploadJob,
      };
      store.dispatch(retryUploads([uploadJob]));
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          uploadFailed(
            `Retry upload ${mockFailedUploadJob.jobName} failed: error`,
            mockFailedUploadJob.jobName || ""
          )
        )
      ).to.be.true;
      expect(fms.retry.called).to.be.true;
    });
  });

  describe("updateUploadLogic", () => {
    const uploadRowKey = "/path/to/file1";

    it("converts array of Moment objects to array of dates", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockDateAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Birth Date": [],
            file: "/path/to/file3",
            [AnnotationName.NOTES]: [],
            templateId: 8,
            [AnnotationName.WELL]: [],
          },
        }),
      });

      // before
      const annotation = "Birth Date";

      // apply
      store.dispatch(updateUpload(uploadRowKey, { [annotation]: [moment()] }));

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation][0] instanceof Date).to.be.true;
    });
    it("converts moment objects to dates", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockDateAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Birth Date": [],
            file: "/path/to/file3",
            [AnnotationName.NOTES]: [],
            templateId: 8,
            [AnnotationName.WELL]: [],
          },
        }),
      });

      // before
      const annotation = "Birth Date";
      expect(getUpload(store.getState())[uploadRowKey][annotation]).to.be.empty;

      // apply
      store.dispatch(updateUpload(uploadRowKey, { [annotation]: moment() }));

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation][0]).to.be.instanceOf(Date);
    });
    it("converts strings to arrays of strings if type is TEXT", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockTextAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Another Garbage Text Annotation": [],
            file: "/path/to/file3",
            [AnnotationName.NOTES]: [],
            templateId: 8,
            [AnnotationName.WELL]: [],
          },
        }),
      });

      // before
      const annotation = "Another Garbage Text Annotation";
      expect(getUpload(store.getState())[uploadRowKey][annotation]).to.be.empty;

      // apply
      store.dispatch(updateUpload(uploadRowKey, { [annotation]: "a,b,c" }));

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation]).to.deep.equal(["a", "b", "c"]);
    });
    it("converts strings to arrays of numbers if type is NUMBER", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockNumberAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Clone Number Garbage": undefined,
            file: "/path/to/file3",
            [AnnotationName.NOTES]: [],
            templateId: 8,
            [AnnotationName.WELL]: [],
          },
        }),
      });

      // before
      const annotation = "Clone Number Garbage";

      // apply
      store.dispatch(updateUpload(uploadRowKey, { [annotation]: "1,2,3" }));

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation]).to.deep.equal([1, 2, 3]);
    });
    it("converts ['1, 2e3, 3.86, bad'] to [1, 2000, 3.86] if type is NUMBER", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockNumberAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Clone Number Garbage": undefined,
            file: "/path/to/file3",
            [AnnotationName.NOTES]: [],
            templateId: 8,
            [AnnotationName.WELL]: [],
          },
        }),
      });

      // before
      const annotation = "Clone Number Garbage";

      // apply
      store.dispatch(
        updateUpload(uploadRowKey, { [annotation]: "1, 2e3, 3.86, bad" })
      );

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation]).to.deep.equal([1, 2000, 3.86]);
    });
    it("converts '' to [] if type is NUMBER", () => {
      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockNumberAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Clone Number Garbage": undefined,
            file: "/path/to/file3",
            [AnnotationName.NOTES]: [],
            templateId: 8,
            [AnnotationName.WELL]: [],
          },
        }),
      });

      // before
      const annotation = "Clone Number Garbage";

      // apply
      store.dispatch(updateUpload(uploadRowKey, { [annotation]: "" }));

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation]).to.deep.equal([]);
    });

    it("converts '' to [] if type is TEXT", () => {
      const { actions, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockTextAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            [mockTextAnnotation.name]: [],
            file: "/path/to/file3",
            [AnnotationName.NOTES]: [],
            templateId: 8,
            [AnnotationName.WELL]: [],
          },
        }),
      });

      // before
      const annotation = mockTextAnnotation.name;

      // apply
      store.dispatch(updateUpload(uploadRowKey, { [annotation]: "" }));

      // after
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey][annotation]).to.deep.equal([]);
      expect(actions.includesMatch({ type: SET_PLATE_BARCODE_TO_PLATES })).to.be
        .false;
    });

    it("sets plateBarcodeToPlates if update includes plate barcode", async () => {
      // Arrange
      const { actions, store, logicMiddleware } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockTextAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            [mockTextAnnotation.name]: [],
            file: "/path/to/file3",
            [AnnotationName.NOTES]: [],
            templateId: 8,
            [AnnotationName.WELL]: [],
          },
        }),
      });
      const plateBarcode = "490109230";
      const expected = {
        [plateBarcode]: [
          {
            name: "imaging session 9",
            imagingSessionId: 9,
            wells: [],
          },
        ],
      };
      labkeyClient.findImagingSessionsByPlateBarcode.resolves([
        { ImagingSessionId: 9, "ImagingSessionId/Name": "imaging session 9" },
      ]);
      mmsClient.getPlate.resolves({
        plate: {
          barcode: "",
          comments: "",
          plateGeometryId: 8,
          plateId: 14,
          plateStatusId: 3,
          ...mockAuditInfo,
        },
        wells: [],
      });

      // Act
      store.dispatch(
        updateUpload(uploadRowKey, {
          [AnnotationName.PLATE_BARCODE]: [plateBarcode],
        })
      );
      await logicMiddleware.whenComplete();

      // Assert
      expect(getPlateBarcodeToPlates(store.getState())).to.deep.equal(expected);
      expect(actions.includesMatch(setPlateBarcodeToPlates(expected))).to.be
        .true;
      expect(
        getUpload(store.getState())[uploadRowKey][AnnotationName.PLATE_BARCODE]
      ).to.deep.equal([plateBarcode]);
    });

    it("does not set plateBarcodeToPlates if already queried for plate barcode", async () => {
      // Arrange
      const plateBarcode = "490109230";
      const expected = {
        [plateBarcode]: [
          {
            name: "imaging session 9",
            imagingSessionId: 9,
            wells: [],
          },
        ],
      };
      const { actions, store, logicMiddleware } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        metadata: {
          ...nonEmptyStateForInitiatingUpload.metadata,
          plateBarcodeToPlates: expected,
        },
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockTextAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            [mockTextAnnotation.name]: [],
            file: "/path/to/file3",
            [AnnotationName.NOTES]: [],
            templateId: 8,
            [AnnotationName.WELL]: [],
          },
        }),
      });

      // Act
      store.dispatch(
        updateUpload(uploadRowKey, {
          [AnnotationName.PLATE_BARCODE]: [plateBarcode],
        })
      );
      await logicMiddleware.whenComplete();

      // Assert
      expect(getPlateBarcodeToPlates(store.getState())).to.deep.equal(expected);
      expect(actions.includesMatch(setPlateBarcodeToPlates(expected))).to.be
        .false;
      expect(
        getUpload(store.getState())[uploadRowKey][AnnotationName.PLATE_BARCODE]
      ).to.deep.equal([plateBarcode]);
    });

    it("queries for plate barcode without imaging session if none found", async () => {
      // Arrange
      const plateBarcode = "490139230";
      const expected = {
        [plateBarcode]: [
          {
            wells: [],
          },
        ],
      };
      const { actions, store, logicMiddleware } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockTextAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            [mockTextAnnotation.name]: [],
            file: "/path/to/file3",
            [AnnotationName.NOTES]: [],
            templateId: 8,
            [AnnotationName.WELL]: [],
          },
        }),
      });
      labkeyClient.findImagingSessionsByPlateBarcode.resolves([]);
      mmsClient.getPlate.resolves({
        plate: {
          barcode: "",
          comments: "",
          plateGeometryId: 8,
          plateId: 14,
          plateStatusId: 3,
          ...mockAuditInfo,
        },
        wells: [],
      });

      // Act
      store.dispatch(
        updateUpload(uploadRowKey, {
          [AnnotationName.PLATE_BARCODE]: [plateBarcode],
        })
      );
      await logicMiddleware.whenComplete();

      // Assert
      expect(getPlateBarcodeToPlates(store.getState())).to.deep.equal(expected);
      expect(actions.includesMatch(setPlateBarcodeToPlates(expected))).to.be
        .true;
      expect(
        getUpload(store.getState())[uploadRowKey][AnnotationName.PLATE_BARCODE]
      ).to.deep.equal([plateBarcode]);
    });
  });

  describe("addUploadFilesLogic", () => {
    it("applies selected templated over saved template", async () => {
      // arrange
      const templateId = 17;
      const badTemplateId = 4;
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            templateId,
          },
        },
        setting: {
          ...mockState.setting,
          templateId: badTemplateId,
        },
      });

      // act
      store.dispatch(addUploadFiles([]));
      await logicMiddleware.whenComplete();

      // assert
      expect(actions.includesMatch(applyTemplate(badTemplateId))).to.be.false;
      expect(actions.includesMatch(applyTemplate(templateId))).to.be.true;
    });

    it("applies saved template", async () => {
      // arrange
      const templateId = 17;
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...mockState,
        setting: {
          ...mockState.setting,
          templateId,
        },
      });

      // act
      store.dispatch(addUploadFiles([]));
      await logicMiddleware.whenComplete();

      // assert
      expect(actions.includesMatch(applyTemplate(templateId))).to.be.true;
    });
  });

  describe("updateUploadRowsLogic", () => {
    it("updates a single upload", () => {
      // arrange
      const uploadRowKey = "/path/to/file1";

      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockDateAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            file: "/path/to/file1",
            [AnnotationName.WELL]: [],
          },
        }),
      });

      const favoriteColor = "Red";

      // act
      store.dispatch(
        updateUploadRows([uploadRowKey], { "Favorite Color": favoriteColor })
      );

      // assert
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey]["Favorite Color"]).to.equal(favoriteColor);
    });

    it("updates multiple uploads", () => {
      // arrange
      const uploadRowKey1 = "/path/to/file1";
      const uploadRowKey2 = "/path/to/file2";

      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [mockDateAnnotation],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey1]: {
            file: "/path/to/file1",
            [AnnotationName.WELL]: [],
          },
          [uploadRowKey2]: {
            file: "/path/to/file2",
            [AnnotationName.WELL]: [],
          },
        }),
      });

      const favoriteColor = "123456";

      // act
      store.dispatch(
        updateUploadRows([uploadRowKey1, uploadRowKey2], {
          "Favorite Color": favoriteColor,
        })
      );

      // assert
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey1]["Favorite Color"]).to.equal(favoriteColor);
      expect(upload[uploadRowKey2]["Favorite Color"]).to.equal(favoriteColor);
    });

    it("converts moment objects to dates", () => {
      // arrange
      const uploadRowKey = "/path/to/file1";

      const { store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        template: {
          ...mockTemplateStateBranch,
          appliedTemplate: {
            ...mockTemplateWithManyValues,
            annotations: [
              {
                ...mockDateAnnotation,
              },
            ],
          },
        },
        upload: getMockStateWithHistory({
          [uploadRowKey]: {
            "Birth Date": undefined,
            file: "/path/to/file1",
            templateId: 8,
            [AnnotationName.WELL]: [],
          },
        }),
      });

      // act
      store.dispatch(
        updateUploadRows([uploadRowKey], { "Birth Date": moment() })
      );

      // assert
      const upload = getUpload(store.getState());
      expect(upload[uploadRowKey]["Birth Date"][0]).to.be.a("Date");
    });
  });
  describe("saveUploadDraftLogic", () => {
    it("shows save dialog and does not dispatch saveUploadDraftSuccess if user cancels save", async () => {
      // Arrange
      const ipcRenderer = {
        send: sandbox.stub(),
        on: sandbox.stub(),
        invoke: sandbox.stub(),
      }
      ipcRenderer.invoke.resolves(undefined);
      const mockDeps = {
        ...mockReduxLogicDeps,
        ipcRenderer
      }
      const { actions, logicMiddleware, store } = createMockReduxStore(mockState, mockDeps);

      // Act
      store.dispatch(saveUploadDraft());
      await logicMiddleware.whenComplete();

      // Assert
      expect(actions.list.find((a) => a.type === SAVE_UPLOAD_DRAFT_SUCCESS)).to
        .be.undefined;
    });

    it("dispatches saveUploadDraftSuccess if user saves draft to file", async () => {
      // Arrange
      const filePath = path.resolve(testDir, "uploadDraft");
      const ipcRenderer = {
        send: sandbox.stub(),
        on: sandbox.stub(),
        invoke: sandbox.stub(),
      }
      ipcRenderer.invoke.resolves(filePath);
      const mockDeps = {
        ...mockReduxLogicDeps,
        ipcRenderer
      }
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload, mockDeps
      );

      // Act
      store.dispatch(saveUploadDraft());
      await logicMiddleware.whenComplete();

      // Assert
      expect(actions.includesMatch(saveUploadDraftSuccess())).to.be.true;
    });

    it("dispatches saveUploadDraftSuccess with filePath used to save draft when saveUploadDraft is called with true", async () => {
      // Arrange
      const filePath = path.resolve(testDir, "uploadDraft");
      const ipcRenderer = {
        send: sandbox.stub(),
        on: sandbox.stub(),
        invoke: sandbox.stub(),
      }
      ipcRenderer.invoke.resolves(filePath);
      const mockDeps = {
        ...mockReduxLogicDeps,
        ipcRenderer
      }
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload, mockDeps
      );

      // Act
      store.dispatch(saveUploadDraft(true));
      await logicMiddleware.whenComplete();
      
      // Assert
      expect(actions.includesMatch(saveUploadDraftSuccess(filePath))).to.be.true;
    });

    it("sets error alert if something goes wrong while saving draft", async () => {
      // Arrange
      const filePath = path.resolve(testDir, "failure", "uploadDraft");
      const ipcRenderer = {
        send: sandbox.stub(),
        on: sandbox.stub(),
        invoke: sandbox.stub(),
      }
      ipcRenderer.invoke.resolves(filePath);
      const mockDeps = {
        ...mockReduxLogicDeps,
        ipcRenderer
      }
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload, mockDeps
      );

      // Act
      store.dispatch(saveUploadDraft());
      await logicMiddleware.whenComplete();

      // Assert
      expect(actions.includesMatch(saveUploadDraftSuccess(filePath))).to.be.false;
      expect(
        actions.includesMatch({type: SET_ALERT})
      ).to.be.true;
    });
  });

  describe("openUploadLogic", () => {
    it("does not show open dialog if user cancels action when asked if they want to save", async () => {
      const ipcRenderer = {
        invoke: sandbox.stub(),
        on: sandbox.stub(),
        send: sandbox.stub(),
      }
      const mockDeps = {
        ...mockReduxLogicDeps,
        ipcRenderer
      }
      ipcRenderer.invoke.onCall(0).resolves(0)
      ipcRenderer.invoke.onCall(1).resolves(testDir)
      ipcRenderer.invoke.resolves(testDir)
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload, mockDeps
      );

      store.dispatch(openUploadDraft());
      await logicMiddleware.whenComplete();

      expect(ipcRenderer.invoke).to.not.have.been.calledThrice;
    });

    it("sets error alert if something goes wrong while trying to save", async () => {
      const ipcRenderer = {
        invoke: sandbox.stub(),
        on: sandbox.stub(),
        send: sandbox.stub(),
      }
      const mockDeps = {
        ...mockReduxLogicDeps,
        ipcRenderer
      }
      ipcRenderer.invoke.onCall(0).resolves(2)
      ipcRenderer.invoke.onCall(1).resolves(testDir)
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload, mockDeps
      );

      store.dispatch(openUploadDraft());
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch({ type: SET_ALERT })
      ).to.be.true;
    });

    it("shows open dialog and replaces upload using data from reading file selected by user", async () => {
      // Arrange
      const ipcRenderer = {
        invoke: sandbox.stub(),
        on: sandbox.stub(),
        send: sandbox.stub(),
      }
      const mockDeps = {
        ...mockReduxLogicDeps,
        ipcRenderer
      }
      const testFile = path.resolve(testDir, "replacement");
      ipcRenderer.invoke.onCall(0).resolves(1)
      ipcRenderer.invoke.onCall(1).resolves(testFile)
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload, mockDeps
      );
      await fs.promises.writeFile(testFile, JSON.stringify(mockState));

      // Act
      store.dispatch(openUploadDraft());
      await logicMiddleware.whenComplete();

      // Assert
      expect(ipcRenderer.invoke).to.have.been.calledTwice;
      expect(actions.includesMatch({ type: REPLACE_UPLOAD })).to.be.true;
    });

    it("creates mapping for new plate barcode entries", async () => {
      // Arrange
      const plateBarcodeToPlates = {
        abc123: [{ wells: [] }],
        def456: [{ wells: [] }],
      };
      const draft = {
        ...mockState,
        metadata: {
          ...mockState.metadata,
          plateBarcodeToPlates,
        },
      };
      const testFile = path.resolve(testDir, "draft.json");
      const ipcRenderer = {
        invoke: sandbox.stub(),
        on: sandbox.stub(),
        send: sandbox.stub(),
      }
      const mockDeps = {
        ...mockReduxLogicDeps,
        ipcRenderer
      }
      ipcRenderer.invoke.onCall(0).resolves(1)
      ipcRenderer.invoke.onCall(1).resolves(testFile)
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload, mockDeps
      );
      await fs.promises.writeFile(testFile, JSON.stringify(draft));

      // Act
      store.dispatch(openUploadDraft());
      await logicMiddleware.whenComplete();

      // Assert
      expect(actions.includesMatch({ type: REPLACE_UPLOAD })).to.be.true;
      expect(
        actions.includesMatch(setPlateBarcodeToPlates(plateBarcodeToPlates))
      ).to.be.true;
    });

    it("converts date strings to date instances", async () => {
      // Arrange
      const expectedFile = "abc123";
      const state: State = {
        ...mockState,
        upload: getMockStateWithHistory({
          [expectedFile]: {
            file: expectedFile,
          },
        }),
      };
      const ipcRenderer = {
        invoke: sandbox.stub(),
        on: sandbox.stub(),
        send: sandbox.stub(),
      }
      const mockDeps = {
        ...mockReduxLogicDeps,
        ipcRenderer
      }
      const testFile = path.resolve(testDir, "draftState");
      ipcRenderer.invoke.onCall(0).resolves(1)
      ipcRenderer.invoke.onCall(1).resolves(testFile)
      const { actions, logicMiddleware, store } = createMockReduxStore({
        ...nonEmptyStateForInitiatingUpload,
        metadata: {
          ...nonEmptyStateForInitiatingUpload.metadata,
          annotations: [
            {
              ...mockDateAnnotation,
              "annotationTypeId/Name": ColumnType.DATE,
              exposeToFileUploadApp: true,
            },
            {
              ...mockDateTimeAnnotation,
              "annotationTypeId/Name": ColumnType.DATETIME,
              exposeToFileUploadApp: true,
            },
          ],
          annotationTypes: mockAnnotationTypes,
        },
      }, mockDeps);
      await fs.promises.writeFile(testFile, JSON.stringify(state));

      // Act
      store.dispatch(openUploadDraft());
      await logicMiddleware.whenComplete();

      // Assert
      expect(actions.includesMatch(addUploadFiles([{ file: expectedFile }]))).to
        .be.true;
    });
  });
  describe("submitFileMetadataUpdateLogic", () => {
    let mockStateForEditingMetadata: State;
    let catUpload: FileModel | undefined;
    let jobName: string;
    beforeEach(() => {
      catUpload = {
        ...mockWellUpload,
        file: "some file",
        fileId: "cat",
      };
      mockStateForEditingMetadata = {
        ...nonEmptyStateForInitiatingUpload,
        selection: {
          ...mockState.selection,
          uploads: [mockSuccessfulUploadJob],
        },
        upload: getMockStateWithHistory({
          cat: catUpload,
        }),
      };
      jobName = mockSuccessfulUploadJob.jobName || "";
    });

    afterEach(() => {
      mmsClient.deleteFileMetadata.restore();
      jssClient.updateJob.restore();
      mmsClient.editFileMetadata.restore();
    });

    it("adds jobName to payload if current job is defined", async () => {
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateForEditingMetadata
      );

      store.dispatch(submitFileMetadataUpdate());
      await logicMiddleware.whenComplete();

      expect(
        actions.includes({
          ...submitFileMetadataUpdate(),
          payload: "file1, file2, file3",
        })
      );
    });
    it("dispatches editFileMetadataFailed when edit file metadata request fails", async () => {
      mmsClient.editFileMetadata.rejects({
        response: {
          data: {
            error: "foo",
          },
        },
      });
      const { actions, logicMiddleware, store } = createMockReduxStore(
        mockStateForEditingMetadata
      );

      store.dispatch(submitFileMetadataUpdate());
      await logicMiddleware.whenComplete();

      expect(
        actions.includesMatch(
          editFileMetadataFailed("Could not edit file: foo", jobName)
        )
      ).to.be.true;
    });

    it("updates jss job with new updates", async () => {
      // Arrange
      const { logicMiddleware, store } = createMockReduxStore(
        mockStateForEditingMetadata
      );

      // Act
      store.dispatch(submitFileMetadataUpdate());
      await logicMiddleware.whenComplete();

      // Assert
      expect(jssClient.updateJob).to.have.been.calledOnce;
    });
  });
  describe("cancelUploads", () => {
    it("dispatches cancel success action upon successful cancellation", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        mockReduxLogicDeps,
        uploadLogics
      );

      // Act
      store.dispatch(cancelUploads([{ ...mockJob }]));
      await logicMiddleware.whenComplete();

      // Assert
      expect(actions.includesMatch(cancelUploadSucceeded(mockJob.jobName))).to
        .be.true;
    });
    it("dispatches cancelUploadFailed if cancelling the upload failed", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        mockReduxLogicDeps,
        uploadLogics
      );
      const errorMessage = "foo";
      fms.cancel.rejects(new Error(errorMessage));

      // Act
      store.dispatch(cancelUploads([{ ...mockJob }]));
      await logicMiddleware.whenComplete();

      // Assert
      expect(
        actions.includesMatch(
          cancelUploadFailed(
            mockJob.jobName,
            `Cancel upload ${mockJob.jobName} failed: ${errorMessage}`
          )
        )
      ).to.be.true;
    });
  });

  describe("uploadWithoutMetadata", () => {
    const filePaths = [
      path.resolve(os.tmpdir(), "uploadWithMetadata1"),
      path.resolve(os.tmpdir(), "uploadWithMetadata2"),
    ];

    before(async () => {
      await Promise.all(
        filePaths.map((filePath, index) => {
          return fs.promises.writeFile(filePath, `some text ${index}`);
        })
      );
    });

    beforeEach(() => {
      fms.initiateUpload.resolves({
        ...mockJob,
        jobId: "abc123",
      });
    });

    afterEach(() => {
      fms.initiateUpload.restore();
      fms.upload.restore();
    });

    after(async () => {
      await Promise.all(
        filePaths.map((filePath) => {
          return fs.promises.unlink(filePath);
        })
      );
    });

    it("uploads files", async () => {
      // Arrange
      const { logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        mockReduxLogicDeps,
        uploadLogics
      );

      // Act
      store.dispatch(uploadWithoutMetadata(filePaths));
      await logicMiddleware.whenComplete();

      // Assert
      expect(fms.initiateUpload.callCount).to.be.equal(filePaths.length);
      expect(fms.upload.callCount).to.be.equal(filePaths.length);
    });

    it("alerts user with uploadFailed action upon failure", async () => {
      // Arrange
      const { actions, logicMiddleware, store } = createMockReduxStore(
        nonEmptyStateForInitiatingUpload,
        mockReduxLogicDeps,
        uploadLogics
      );
      fms.initiateUpload.resolves(mockJob);
      filePaths.forEach((filePath, index) => {
        fms.initiateUpload.onCall(index).resolves({
          ...mockJob,
          jobName: path.basename(filePath),
        });
      });
      const error = "fake error";
      fms.upload.rejects(new Error(error));

      // Act
      store.dispatch(uploadWithoutMetadata(filePaths));
      await logicMiddleware.whenComplete();

      // Assert
      filePaths.forEach((filePath) => {
        const fileName = path.basename(filePath);
        expect(
          actions.includesMatch(
            uploadFailed(
              `Something went wrong while uploading your files. Details: ${error}`,
              fileName
            )
          )
        ).to.be.true;
      });
    });
  });
});

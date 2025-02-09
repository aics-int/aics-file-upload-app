import { StateWithHistory } from "redux-undo";

import { AnnotationName } from "../../constants";
import { GridCell } from "../../entities";
import { FSSUpload } from "../../services/file-storage-service";
import {
  JSSJobStatus,
  Service,
  UploadJob,
} from "../../services/job-status-service/types";
import {
  Annotation,
  AnnotationLookup,
  AnnotationOption,
  AnnotationType,
  ColumnType,
  Lookup,
  Unit,
  ImagingSession,
  BarcodePrefix,
  User,
} from "../../services/labkey-client/types";
import {
  CellPopulation,
  Template,
  TemplateAnnotation,
} from "../../services/metadata-management-service/types";
import { UploadType } from "../../types";
import {
  feedback,
  job,
  metadata,
  route,
  selection,
  setting,
  template,
  upload,
} from "../index";
import { Well } from "../selection/types";
import {
  AnnotationDraft,
  JobStateBranch,
  SelectionStateBranch,
  State,
  TemplateDraft,
  TemplateStateBranch,
} from "../types";
import { UploadStateBranch } from "../types";

export const mockAuditInfo = {
  created: new Date(2019, 9, 30),
  createdBy: 1,
  modified: new Date(2019, 9, 30),
  modifiedBy: 1,
};

export const mockFavoriteColorAnnotation: Annotation = {
  ...mockAuditInfo,
  annotationId: 1,
  annotationTypeId: 1,
  description: "a description",
  name: "Favorite Color",
  exposeToFileUploadApp: true,
  "annotationTypeId/Name": ColumnType.DROPDOWN,
};

export const mockFavoriteColorTemplateAnnotation: TemplateAnnotation = {
  ...mockFavoriteColorAnnotation,
  orderIndex: 0,
  required: true,
};

const mockIntervalAnnotation: Annotation = {
  ...mockAuditInfo,
  annotationId: 101,
  annotationTypeId: 8,
  description: "Example duration annotation",
  name: "Interval",
  exposeToFileUploadApp: true,
  "annotationTypeId/Name": ColumnType.DURATION,
};

export const mockWellAnnotation: Annotation = {
  ...mockAuditInfo,
  annotationId: 2,
  annotationTypeId: 6,
  description: "Well associated with this file",
  exposeToFileUploadApp: true,
  name: AnnotationName.WELL,
  "annotationTypeId/Name": ColumnType.LOOKUP,
};

export const mockNotesAnnotation: Annotation = {
  ...mockAuditInfo,
  annotationId: 3,
  annotationTypeId: 1,
  description: "Other information",
  exposeToFileUploadApp: true,
  name: AnnotationName.NOTES,
  "annotationTypeId/Name": ColumnType.TEXT,
};

const mockUnusableStructureAnnotation: Annotation = {
  ...mockAuditInfo,
  annotationId: 4,
  annotationTypeId: 1,
  description: "Other information",
  exposeToFileUploadApp: false,
  name: "Structure",
  "annotationTypeId/Name": ColumnType.LOOKUP,
};

export const mockMMSTemplate: Template = {
  ...mockAuditInfo,
  annotations: [mockFavoriteColorTemplateAnnotation],
  name: "Test",
  templateId: 1,
  version: 1,
};

export const mockIntervalTemplate: Template = {
  ...mockAuditInfo,
  annotations: [{ ...mockIntervalAnnotation, orderIndex: 0, required: true }],
  name: "Test for Interval",
  templateId: 1,
  version: 1,
};

export const mockTemplateStateBranch: TemplateStateBranch = {
  appliedTemplate: undefined,
  draft: {
    annotations: [],
  },
};

export const mockTemplateStateBranchWithAppliedTemplate: TemplateStateBranch = {
  ...mockTemplateStateBranch,
  appliedTemplate: mockMMSTemplate,
};

export const mockAnnotations = [
  mockFavoriteColorAnnotation,
  mockIntervalAnnotation,
  mockWellAnnotation,
  mockNotesAnnotation,
  mockUnusableStructureAnnotation,
];

export const mockLookupOptions = ["option1", "option2", "option3"];

export const getMockStateWithHistory = <T>(state: T): StateWithHistory<T> => {
  return {
    _latestUnfiltered: { ...state },
    future: [],
    group: {},
    index: 0,
    limit: 10,
    past: [],
    present: { ...state },
  };
};

const mockCellPopulation: CellPopulation = {
  seedingDensity: "1000",
  sourceVial: { barcode: "abc" },
};

export const mockWell: Well = {
  cellPopulations: [mockCellPopulation],
  col: 0,
  plateId: 1,
  row: 0,
  solutions: [],
  wellId: 1,
};

export const mockJob: UploadJob = {
  created: new Date(),
  jobId: "1340202",
  jobName: "test_file.txt",
  modified: new Date(),
  originationHost: "dev-aics-fup-001",
  service: Service.FILE_UPLOAD_APP,
  serviceFields: {
    files: [],
    type: "upload",
  },
  status: JSSJobStatus.WAITING,
  updateParent: false,
  user: "fakeuser",
};

export const mockSelection: SelectionStateBranch = {
  user: "fake_user",
  uploads: [],
  uploadType: null,
  ShouldBeInLocal: true,
};

export const mockWellUpload: UploadStateBranch = {
  "/path/to/file1": {
    barcode: "1234",
    ["Favorite Color"]: ["Red"],
    file: "/path/to/file1",
    key: "/path/to/file1",
    [AnnotationName.WELL]: [1],
  },
  "/path/to/file2": {
    barcode: "1235",
    ["Favorite Color"]: ["Red"],
    file: "/path/to/file2",
    key: "/path/to/file2",
    [AnnotationName.WELL]: [2],
  },
  "/path/to/file3": {
    barcode: "1236",
    ["Favorite Color"]: ["Red"],
    file: "/path/to/file3",
    key: "/path/to/file3",
    [AnnotationName.WELL]: [1, 2, 3],
  },
  "/path/to/file4.zarr": { // multifile
    barcode: "1237",
    ["Favorite Color"]: ["Red"],
    file: "/path/to/file4.zarr",
    uploadType: UploadType.Multifile,
    key: "/path/to/file4.zarr",
    [AnnotationName.WELL]: [1, 2, 3],
  },
  "/path/to/file5.sldy": { // multifile
    barcode: "1238",
    ["Favorite Color"]: ["Red"],
    file: "/path/to/file5.sldy",
    uploadType: UploadType.Multifile,
    key: "/path/to/file5.sldy",
    [AnnotationName.WELL]: [1, 2, 3],
  },
};

export const mockTextAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 56,
  annotationTypeId: 1,
  description: "some description",
  lookupSchema: undefined,
  lookupTable: undefined,
  orderIndex: 0,
  name: "Another Garbage Text Annotation",
  required: false,
};

export const mockDateAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 68,
  annotationTypeId: 7,
  description: "dob - for testing",
  lookupSchema: undefined,
  lookupTable: undefined,
  orderIndex: 1,
  name: "Birth Date",
  required: false,
};

export const mockDateTimeAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 70,
  annotationTypeId: 4,
  description: "",
  lookupSchema: undefined,
  lookupTable: undefined,
  orderIndex: 2,
  name: "Seeded On",
  required: false,
};

export const mockNumberAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 64,
  annotationTypeId: 2,
  description: "for testing number annotations",
  lookupSchema: undefined,
  lookupTable: undefined,
  orderIndex: 3,
  name: "Clone Number Garbage",
  required: false,
};

export const mockLookupAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 2,
  annotationOptions: ["spCas9", "Not Recorded"],
  annotationTypeId: 6,
  description: "CRISPR associated protein 9",
  lookupSchema: "celllines",
  lookupTable: "cas9",
  orderIndex: 4,
  name: "Cas9",
  required: false,
};

export const mockFmsFileLookupAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 3,
  annotationOptions: [
    "File 1 (AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA)",
    "File 2 (BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB)",
  ],
  annotationTypeId: 6,
  description: "Files from the FMS.File table",
  lookupSchema: "fms",
  lookupTable: "file",
  orderIndex: 4,
  name: "FileLookupAnnotation",
  required: false,
};

export const mockDropdownAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 69,
  annotationOptions: ["A", "B", "C", "D"],
  annotationTypeId: 5,
  description: "test",
  lookupSchema: undefined,
  lookupTable: undefined,
  orderIndex: 5,
  name: "Dropdown",
  required: false,
};

export const mockBooleanAnnotation: TemplateAnnotation = {
  ...mockAuditInfo,
  annotationId: 61,
  annotationTypeId: 3,
  description: "Is this image related to QC of a gene-edited line?",
  lookupSchema: undefined,
  lookupTable: undefined,
  orderIndex: 6,
  name: "Qc",
  required: false,
};

export const mockTemplateWithManyValues: Template = {
  ...mockAuditInfo,
  annotations: [
    mockTextAnnotation,
    mockDateAnnotation,
    mockDateTimeAnnotation,
    mockLookupAnnotation,
    mockNumberAnnotation,
    mockBooleanAnnotation,
    mockDropdownAnnotation,
    {
      ...mockAuditInfo,
      annotationId: 21,
      annotationTypeId: 6,
      description:
        "A well on a plate (that has been entered into the Plate UI)",
      name: "Well Ids",
      orderIndex: 7,
      required: false,
    },
    {
      ...mockAuditInfo,
      annotationId: 22,
      annotationTypeId: 1,
      description:
        "Additional information that doesn't align well with other annotations",
      name: AnnotationName.NOTES,
      orderIndex: 8,
      required: true,
    },
  ],
  name: "Test multiple values",
  templateId: 8,
  version: 1,
};

export const mockState: State = {
  feedback: feedback.initialState,
  job: job.initialState,
  metadata: metadata.initialState,
  route: route.initialState,
  selection: selection.initialState,
  setting: setting.initialState,
  template: template.initialState,
  upload: getMockStateWithHistory(upload.initialState),
};

export const mockUnits: Unit[] = [
  {
    description: "",
    name: "unit1",
    type: "volume",
    unitsId: 1,
  },
  {
    description: "",
    name: "unit2",
    type: "volume",
    unitsId: 2,
  },
  {
    description: "",
    name: "unit3",
    type: "mass",
    unitsId: 3,
  },
  {
    description: "",
    name: "unit4",
    type: "mass",
    unitsId: 4,
  },
];

export const mockSelectedWells: GridCell[] = [
  new GridCell(0, 0),
  new GridCell(0, 1),
  new GridCell(1, 0),
  new GridCell(1, 1),
];

export const mockSuccessfulUploadJob: UploadJob = {
  created: new Date(),
  currentStage: "Completed",
  jobId: "123434234",
  jobName: "mockJob1",
  modified: new Date(),
  service: Service.FILE_UPLOAD_APP,
  serviceFields: {
    result: [
      { fileId: "cat", fileName: "cat", readPath: "cat" },
      { fileId: "dog", fileName: "cat", readPath: "cat" },
    ],
    files: [],
    postUploadProcessing: {
      etl: {
        service: "fms-mongo-etl",
        status: JSSJobStatus.SUCCEEDED,
        created: new Date(),
        modified: new Date(),
      },
    },
    type: "upload",
  },
  status: JSSJobStatus.SUCCEEDED,
  user: "test_user",
};

export const mockFSSUploadJob: FSSUpload = {
  created: new Date(),
  currentStage: "UPLOAD_IN_PROGRESS",
  jobId: "3333333333FSS",
  jobName: "mockFSSUploadJob",
  modified: new Date(),
  service: Service.FILE_STORAGE_SERVICE,
  serviceFields: {
    fileId: "82beaf0460384911b6d6293fb333c4b0",
  },
  status: JSSJobStatus.WORKING,
  user: "test_user",
};

export const mockSuccessfulUploadJobWithUnexposedAnnotation: UploadJob = {
  created: new Date(),
  currentStage: "Completed",
  jobId: "123434234",
  jobName: "mockJob1",
  modified: new Date(),
  serviceFields: {
    files: [
      {
        customMetadata: {
          annotations: [
            {
              annotationId: 1,
              values: ["test", "1"],
            },
            {
              annotationId: 4,
              values: ["test", "1"],
            },
          ],
          templateId: 1,
        },
        file: {
          originalPath: "/some/filepath",
          fileType: "other",
          shouldBeInArchive: true,
          shouldBeInLocal: true,
        },
      },
    ],
    type: "upload",
  },
  status: JSSJobStatus.SUCCEEDED,
  user: "test_user",
};

export const mockWorkingUploadJob: UploadJob = {
  created: new Date(),
  currentStage: "Copying files",
  jobId: "1111111111",
  jobName: "mockWorkingUploadJob",
  modified: new Date(),
  service: Service.FILE_UPLOAD_APP,
  serviceFields: {
    files: [],
    lastModifiedInMS: new Date().getMilliseconds(),
    type: "upload",
  },
  status: JSSJobStatus.WORKING,
  user: "test_user",
};

export const mockWaitingUploadJob: UploadJob = {
  created: new Date(),
  currentStage: "Waiting",
  jobId: "2222222222",
  jobName: "mockWaitingUploadJob",
  modified: new Date(),
  service: Service.FILE_UPLOAD_APP,
  serviceFields: {
    files: [
      {
        customMetadata: {
          annotations: [
            {
              annotationId: 1,
              values: ["test", "1"],
            },
          ],
          templateId: 1,
        },
        file: {
          originalPath: "/some/filepath",
          fileType: "other",
          shouldBeInArchive: true,
          shouldBeInLocal: true,
        },
      },
    ],
    lastModifiedInMS: new Date().getMilliseconds(),
    type: "upload",
  },
  status: JSSJobStatus.WAITING,
  user: "test_user",
};

export const mockFailedUploadJob: UploadJob = {
  created: new Date(),
  currentStage: "Copy error",
  jobId: "3333333333",
  jobName: "mockFailedUploadJob",
  modified: new Date(),
  service: Service.FILE_UPLOAD_APP,
  serviceFields: {
    files: [
      {
        customMetadata: {
          annotations: [
            {
              annotationId: 1,
              values: ["test", "1"],
            },
          ],
          templateId: 1,
        },
        file: {
          originalPath: "/some/filepath",
          fileType: "other",
          shouldBeInArchive: true,
          shouldBeInLocal: true,
        },
      },
    ],
    lastModifiedInMS: new Date().getMilliseconds(),
    type: "upload",
  },
  status: JSSJobStatus.FAILED,
  user: "test_user",
};

export const mockAnnotationTypes: AnnotationType[] = [
  {
    annotationTypeId: 1,
    name: ColumnType.TEXT,
  },
  {
    annotationTypeId: 2,
    name: ColumnType.NUMBER,
  },
  {
    annotationTypeId: 3,
    name: ColumnType.BOOLEAN,
  },
  {
    annotationTypeId: 4,
    name: ColumnType.DATETIME,
  },
  {
    annotationTypeId: 5,
    name: ColumnType.DROPDOWN,
  },
  {
    annotationTypeId: 6,
    name: ColumnType.LOOKUP,
  },
  {
    annotationTypeId: 7,
    name: ColumnType.DATE,
  },
  {
    annotationTypeId: 8,
    name: ColumnType.DURATION,
  },
];

export const nonEmptyJobStateBranch: JobStateBranch = {
  ...mockState.job,
  uploadJobs: [
    mockSuccessfulUploadJob,
    mockWorkingUploadJob,
    mockFailedUploadJob,
  ],
};

export const mockAnnotationDraft: AnnotationDraft = {
  annotationId: 1,
  annotationTypeId: 1,
  annotationTypeName: "Text",
  description: "You know what a color is",
  orderIndex: 0,
  name: "Color",
  required: false,
  ...mockAuditInfo,
};

export const mockTemplateDraft: TemplateDraft = {
  annotations: [mockAnnotationDraft],
  name: "My Template",
  version: 1,
};

export const mockAnnotationLookups: AnnotationLookup[] = [
  {
    annotationId: mockWellAnnotation.annotationId,
    lookupId: 1,
  },
];

export const mockAnnotationOptions: AnnotationOption[] = [
  {
    annotationId: 1,
    annotationOptionId: 1,
    value: "Green",
  },
];

export const mockImagingSessions: ImagingSession[] = [
  {
    description: "",
    imagingSessionId: 1,
    name: "1 Week",
  },
  {
    description: "",
    imagingSessionId: 2,
    name: "2 Weeks",
  },
];

export const mockBarcodePrefixes: BarcodePrefix[] = [
  {
    description: "Assay Dev",
    prefix: "AD",
    prefixId: 1,
  },
  {
    description: "Microscopy",
    prefix: "MI",
    prefixId: 2,
  },
];

export const mockUnit: Unit = {
  description: "description",
  name: "name",
  type: "type",
  unitsId: 1,
};

export const mockUser: User = {
  displayName: "tester",
  userId: 3,
};

export const mockLookups: Lookup[] = [
  {
    ...mockAuditInfo,
    columnName: "columnname",
    descriptionColumn: "description",
    lookupId: 1,
    schemaName: "schema",
    tableName: "tablename",
    "scalarTypeId/Name": "scalartypename",
  },
];

export const nonEmptyStateForInitiatingUpload: State = {
  ...mockState,
  metadata: {
    ...mockState.metadata,
    annotationLookups: mockAnnotationLookups,
    annotationOptions: mockAnnotationOptions,
    annotationTypes: mockAnnotationTypes,
    annotations: mockAnnotations,
    currentUpload: {
      created: new Date(),
      modified: new Date(),
      name: "foo",
    },
    lookups: mockLookups,
    users: [mockUser],
  },
  selection: {
    ...mockSelection,
  },
  template: {
    ...mockTemplateStateBranch,
    appliedTemplate: mockMMSTemplate,
  },
  upload: getMockStateWithHistory(mockWellUpload),
};

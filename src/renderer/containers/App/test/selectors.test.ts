import { expect } from "chai";
import { get } from "lodash";
import * as moment from "moment";

import {
  WELL_ANNOTATION_NAME,
  WORKFLOW_ANNOTATION_NAME,
} from "../../../constants";
import { Page } from "../../../state/route/types";
import {
  getMockStateWithHistory,
  mockSelection,
  mockState,
  mockSuccessfulUploadJob,
  mockWells,
} from "../../../state/test/mocks";
import { State } from "../../../state/types";
import { DRAFT_KEY } from "../../../state/upload/constants";
import {
  getCurrentUploadKey,
  getCurrentUploadName,
  getFileToTags,
  getUploadTabName,
} from "../selectors";

const CREATED = "Mar 24, 2020 3:14 PM";
const UPLOAD_NAME = "foo";
const stateWithCurrentUpload = Object.freeze({
  ...mockState,
  metadata: {
    ...mockState.metadata,
    currentUpload: {
      created: moment(CREATED, "lll").toDate(),
      modified: new Date(),
      name: UPLOAD_NAME,
    },
  },
});

describe("App selectors", () => {
  describe("getFileToTags", () => {
    const filePath1 = "filepath1";
    const filePath2 = "filepath2";
    let stateWithWellAssociations: State;
    let stateWithWorkflowAssociations: State;

    beforeEach(() => {
      stateWithWellAssociations = {
        ...mockState,
        route: {
          ...mockState.route,
          page: Page.AssociateFiles,
          view: Page.AssociateFiles,
        },
        selection: getMockStateWithHistory({
          ...mockSelection,
          wells: mockWells,
        }),
        upload: getMockStateWithHistory({
          [filePath1]: {
            barcode: "test_barcode",
            file: filePath1,
            [WELL_ANNOTATION_NAME]: [1, 3],
          },
          [filePath2]: {
            barcode: "test_barcode",
            file: filePath2,
            [WELL_ANNOTATION_NAME]: [4],
          },
        }),
      };
      stateWithWorkflowAssociations = {
        ...mockState,
        route: {
          ...mockState.route,
          page: Page.AssociateFiles,
        },
        upload: getMockStateWithHistory({
          [filePath1]: {
            barcode: "test_barcode",
            file: filePath1,
            [WELL_ANNOTATION_NAME]: [],
            [WORKFLOW_ANNOTATION_NAME]: ["work3", "work4"],
          },
          [filePath2]: {
            barcode: "test_barcode",
            file: filePath2,
            [WELL_ANNOTATION_NAME]: [],
            [WORKFLOW_ANNOTATION_NAME]: ["work2"],
          },
        }),
      };
    });

    it("creates human readable info from wells", () => {
      const map = getFileToTags(stateWithWellAssociations);

      const file1Tags = map.get(filePath1) || [];
      expect(file1Tags.length).to.equal(2);
      expect(file1Tags.map((t) => t.title)).to.contain("A1");
      expect(file1Tags.map((t) => t.title)).to.contain("B1");
      expect(get(file1Tags, [0, "closable"])).to.be.true;
      expect(get(file1Tags, [1, "closable"])).to.be.true;

      const file2Tags = map.get(filePath2) || [];
      expect(file2Tags.length).to.equal(1);
      expect(get(file2Tags, [0, "title"])).to.equal("B2");
      expect(get(file2Tags, [0, "closable"])).to.be.true;

      expect(get(file1Tags, [0, "color"])).to.equal(
        get(file2Tags, [0, "color"])
      );
    });

    it("adds imaging session name if well was from another imaging session", () => {
      const map = getFileToTags({
        ...mockState,
        metadata: {
          ...mockState.metadata,
          imagingSessions: [
            {
              description: "2 hours after plated",
              imagingSessionId: 1,
              name: "2 hours",
            },
          ],
        },
        selection: getMockStateWithHistory({
          ...mockSelection,
          wells: mockWells,
        }),
        upload: getMockStateWithHistory({
          [filePath1]: {
            barcode: "test_barcode",
            file: filePath1,
            [WELL_ANNOTATION_NAME]: [10],
          },
        }),
      });

      const file1ToTags = map.get(filePath1) || [];
      expect(file1ToTags.length).to.equal(1);
      expect(file1ToTags.map((t) => t.title)).to.contain("A1 (2 hours)");
    });

    it("creates human readable info from workflows", () => {
      const map = getFileToTags(stateWithWorkflowAssociations);

      const file1Tags = map.get(filePath1) || [];
      expect(file1Tags.length).to.equal(2);
      expect(get(file1Tags, [0, "title"])).to.equal("work3");
      expect(get(file1Tags, [0, "closable"])).to.be.true;
      expect(get(file1Tags, [1, "title"])).to.equal("work4");
      expect(get(file1Tags, [1, "closable"])).to.be.true;

      const file2Tags = map.get(filePath2) || [];
      expect(file2Tags.length).to.equal(1);
      expect(get(file2Tags, [0, "title"])).to.equal("work2");
      expect(get(file2Tags, [0, "closable"])).to.be.true;

      expect(get(file1Tags, [0, "color"])).to.equal(
        get(file2Tags, [0, "color"])
      );
    });

    it("creates non-closeable tag for well if on the SelectStorageLocation page", () => {
      const map = getFileToTags({
        ...stateWithWellAssociations,
        route: {
          page: Page.SelectStorageLocation,
          view: Page.SelectStorageLocation,
        },
      });

      expect(get(map.get(filePath1), [0, "closable"])).to.be.false;
    });

    it("creates non-closeable tag for well if on the AddCustomData page", () => {
      const map = getFileToTags({
        ...stateWithWellAssociations,
        route: {
          page: Page.AddCustomData,
          view: Page.AddCustomData,
        },
      });

      expect(get(map.get(filePath1), [0, "closable"])).to.be.false;
    });

    it("creates non-closeable tag for workflow if on the SelectStorageLocation page", () => {
      const map = getFileToTags({
        ...stateWithWorkflowAssociations,
        route: {
          ...mockState.route,
          page: Page.SelectStorageLocation,
          view: Page.SelectStorageLocation,
        },
      });

      const file1Tags = map.get(filePath1) || [];
      expect(get(file1Tags, [0, "closable"])).to.be.false;
      expect(get(file1Tags, [1, "closable"])).to.be.false;

      const file2Tags = map.get(filePath2) || [];
      expect(get(file2Tags, [0, "closable"])).to.be.false;
    });

    it("creates non-closeable tag for workflow if on the AddCustomData page", () => {
      const map = getFileToTags({
        ...stateWithWorkflowAssociations,
        route: {
          ...mockState.route,
          page: Page.AddCustomData,
        },
      });

      const file1Tags = map.get(filePath1) || [];
      expect(get(file1Tags, [0, "closable"])).to.be.false;
      expect(get(file1Tags, [1, "closable"])).to.be.false;

      const file2Tags = map.get(filePath2) || [];
      expect(get(file2Tags, [0, "closable"])).to.be.false;
    });

    it("creates a closeable tag for storage intents if on the SelectStorageLocation page", () => {
      const map = getFileToTags({
        ...mockState,
        route: {
          ...mockState.route,
          page: Page.SelectStorageLocation,
          view: Page.SelectStorageLocation,
        },
        selection: getMockStateWithHistory({
          ...mockSelection,
          wells: mockWells,
        }),
        upload: getMockStateWithHistory({
          [filePath1]: {
            barcode: "test_barcode",
            file: filePath1,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [1, 3],
          },
          [filePath2]: {
            barcode: "test_barcode",
            file: filePath2,
            shouldBeInArchive: false,
            shouldBeInLocal: true,
            [WELL_ANNOTATION_NAME]: [4],
          },
        }),
      });

      const file1Tags = map.get(filePath1) || [];
      expect(get(file1Tags, [2, "title"])).to.equal("Archive");
      expect(get(file1Tags, [2, "closable"])).to.be.true;

      const file2Tags = map.get(filePath2) || [];
      expect(get(file2Tags, [1, "title"])).to.equal("Isilon");
      expect(get(file2Tags, [1, "closable"])).to.be.true;
    });
    it("creates a non-closeable tag for storage intents if on the AddCustomData page", () => {
      const map = getFileToTags({
        ...mockState,
        route: {
          ...mockState.route,
          page: Page.AddCustomData,
          view: Page.AddCustomData,
        },
        selection: getMockStateWithHistory({
          ...mockSelection,
          wells: mockWells,
        }),
        upload: getMockStateWithHistory({
          [filePath1]: {
            barcode: "test_barcode",
            file: filePath1,
            shouldBeInArchive: true,
            shouldBeInLocal: false,
            [WELL_ANNOTATION_NAME]: [1, 3],
          },
          [filePath2]: {
            barcode: "test_barcode",
            file: filePath2,
            shouldBeInArchive: false,
            shouldBeInLocal: true,
            [WELL_ANNOTATION_NAME]: [4],
          },
        }),
      });

      const file1Tags = map.get(filePath1) || [];
      expect(get(file1Tags, [2, "title"])).to.equal("Archive");
      expect(get(file1Tags, [2, "closable"])).to.be.false;

      const file2Tags = map.get(filePath2) || [];
      expect(get(file2Tags, [1, "title"])).to.equal("Isilon");
      expect(get(file2Tags, [1, "closable"])).to.be.false;
    });
  });
  describe("getCurrentUploadName", () => {
    it("returns current upload name if there is a current upload", () => {
      const name = getCurrentUploadName(stateWithCurrentUpload);
      expect(name).to.equal(UPLOAD_NAME);
    });
    it("returns undefined if there is not a current upload", () => {
      const name = getCurrentUploadName(mockState);
      expect(name).to.be.undefined;
    });
  });
  describe("getCurrentUploadKey", () => {
    it("returns concatenation of name and created date", () => {
      const key = getCurrentUploadKey(stateWithCurrentUpload);
      expect(key).to.equal(`${DRAFT_KEY}.${UPLOAD_NAME}-${CREATED}`);
    });
    it("returns undefined if there is not a current upload", () => {
      const key = getCurrentUploadKey(mockState);
      expect(key).to.be.undefined;
    });
  });
  describe("getUploadTabName", () => {
    it("returns upload name if an upload draft is open", () => {
      const name = getUploadTabName(stateWithCurrentUpload);
      expect(name).to.equal(getCurrentUploadName(stateWithCurrentUpload));
    });
    it("returns 'Edit Job: [JobName]' if job is selected", () => {
      const name = getUploadTabName({
        ...mockState,
        selection: getMockStateWithHistory({
          ...mockState.selection.present,
          job: mockSuccessfulUploadJob,
        }),
      });
      expect(name).to.equal(`Edit Job: ${mockSuccessfulUploadJob.jobName}`);
    });
    it("returns 'Current Upload' if user is working on a new upload", () => {
      const name = getUploadTabName(mockState);
      expect(name).to.equal("Current Upload");
    });
  });
});

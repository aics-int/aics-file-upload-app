import { expect } from "chai";

import { AnnotationName } from "../../../constants";
import { JSSJobStatus } from "../../../services/job-status-service/types";
import { ROW_COUNT_COLUMN } from "../../constants";
import { mockJob, mockSelection, mockState } from "../../test/mocks";
import {
  getAreSelectedUploadsInFlight,
  getMassEditRowAsTableRow,
} from "../selectors";

describe("Selections selectors", () => {
  describe("getAreSelectedUploadsInFlight", () => {
    it("returns false without job selected", () => {
      // Act
      const result = getAreSelectedUploadsInFlight(mockState);

      // Assert
      expect(result).to.be.false;
    });

    [JSSJobStatus.SUCCEEDED, JSSJobStatus.FAILED].forEach((status) => {
      it(`returns false with job selected and job status ${status}`, () => {
        // Act
        const state = {
          ...mockState,
          selection: {
            ...mockSelection,
            uploads: [
              {
                ...mockJob,
                status,
              },
            ],
          },
        };
        const result = getAreSelectedUploadsInFlight(state);

        // Assert
        expect(result).to.be.false;
      });
    });

    [
      JSSJobStatus.UNRECOVERABLE,
      JSSJobStatus.WORKING,
      JSSJobStatus.RETRYING,
      JSSJobStatus.WAITING,
      JSSJobStatus.BLOCKED,
    ].forEach((status) => {
      it(`returns true with job selected and job status ${status}`, () => {
        // Act
        const state = {
          ...mockState,
          selection: {
            ...mockSelection,
            uploads: [
              {
                ...mockJob,
                status,
              },
            ],
          },
        };
        const result = getAreSelectedUploadsInFlight(state);

        // Assert
        expect(result).to.be.true;
      });
    });
  });

  describe("getMassEditRowAsTableRow", () => {
    it("returns row with count and wellLabels", () => {
      // Arrange
      const wellId1 = 4;
      const wellId2 = 7;
      const massEditRow = {
        CellLine: ["AICS-0"],
        Color: ["Blue", "Green"],
        [AnnotationName.WELL]: [wellId1, wellId2],
      };
      const rowsSelectedForMassEdit = ["1", "39", "62"];
      const state = {
        ...mockState,
        selection: {
          ...mockSelection,
          massEditRow,
          rowsSelectedForMassEdit,
        },
      };

      // Act
      const result = getMassEditRowAsTableRow(state);

      // Assert
      expect(result).to.deep.equal({
        ...massEditRow,
        [ROW_COUNT_COLUMN]: rowsSelectedForMassEdit.length,
      });
    });
  });
});

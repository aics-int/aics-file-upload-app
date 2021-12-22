import { expect } from "chai";

import { receiveFSSJobCompletionUpdate, receiveJobs } from "../../job/actions";
import {
  receiveAnnotationUsage,
  requestAnnotationUsage,
} from "../../metadata/actions";
import {
  resetUpload,
  viewUploads,
  viewUploadsSucceeded,
} from "../../route/actions";
import { openTemplateEditor } from "../../selection/actions";
import {
  clearTemplateDraft,
  saveTemplate,
  saveTemplateSucceeded,
  setAppliedTemplate,
  startTemplateDraft,
  startTemplateDraftFailed,
} from "../../template/actions";
import {
  mockFailedUploadJob,
  mockFSSUploadJob,
  mockMMSTemplate,
  mockSuccessfulUploadJob,
  mockTemplateDraft,
  mockWellUpload,
  mockWorkingUploadJob,
} from "../../test/mocks";
import { AlertType, AsyncRequest, FeedbackStateBranch } from "../../types";
import {
  applyTemplate,
  cancelUploads,
  cancelUploadFailed,
  cancelUploadSucceeded,
  editFileMetadataFailed,
  editFileMetadataSucceeded,
  initiateUpload,
  initiateUploadFailed,
  initiateUploadSucceeded,
  retryUploads,
  submitFileMetadataUpdate,
  uploadFailed,
  uploadSucceeded,
} from "../../upload/actions";
import {
  addEvent,
  addRequestToInProgress,
  clearAlert,
  clearDeferredAction,
  clearUploadError,
  closeModal,
  closeNotificationCenter,
  closeSetMountPointNotification,
  openModal,
  openSetMountPointNotification,
  removeRequestFromInProgress,
  setAlert,
  setDeferredAction,
  setErrorAlert,
  startLoading,
  stopLoading,
} from "../actions";
import reducer from "../reducer";
import { initialState } from "../reducer";

describe("feedback reducer", () => {
  describe("clearAlert", () => {
    let stateWithAlert: FeedbackStateBranch;
    beforeEach(() => {
      stateWithAlert = {
        ...initialState,
        alert: {
          message: "foo",
          type: AlertType.SUCCESS,
        },
      };
    });
    it("sets alert to undefined", () => {
      const result = reducer(stateWithAlert, clearAlert());
      expect(result.alert).to.be.undefined;
    });
    it("appends a new event to events", () => {
      const result = reducer(stateWithAlert, clearAlert());
      expect(result.events.length).to.equal(1);
    });
    it("does not change state if no alert to clear", () => {
      const result = reducer(initialState, clearAlert());
      expect(result).to.equal(initialState);
    });
  });
  describe("setAlert", () => {
    it("sets alert with original message if provided", () => {
      const message = "foo";
      const result = reducer(
        initialState,
        setAlert({
          message,
          type: AlertType.ERROR,
        })
      );
      expect(result.alert).to.not.be.undefined;
      if (result.alert) {
        expect(result.alert.message).to.equal(message);
      }
    });
    it("it adds the message 'Bad Gateway Error: Labkey or MMS is down.' if the statusCode is 502", () => {
      const result = reducer(
        initialState,
        setAlert({
          message: undefined,
          statusCode: 502,
          type: AlertType.ERROR,
        })
      );
      expect(result.alert).to.not.be.undefined;
      if (result.alert) {
        expect(result.alert.message).to.equal(
          "Bad Gateway Error: Labkey or MMS is down."
        );
      }
    });
  });
  describe("startLoading", () => {
    it("sets isLoading to true", () => {
      const result = reducer(initialState, startLoading());
      expect(result.isLoading).to.be.true;
    });
  });
  describe("stopLoading", () => {
    it("sets isLoading to false", () => {
      const result = reducer(
        { ...initialState, isLoading: false },
        stopLoading()
      );
      expect(result.isLoading).to.be.false;
    });
  });
  describe("addRequestInProgress", () => {
    it("adds request to requestsInProgress", () => {
      const result = reducer(
        initialState,
        addRequestToInProgress(AsyncRequest.GET_TEMPLATE)
      );
      expect(result.requestsInProgress.includes(AsyncRequest.GET_TEMPLATE)).to
        .be.true;
    });
    it("does not add same request more than once", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.GET_TEMPLATE],
        },
        addRequestToInProgress(AsyncRequest.GET_TEMPLATE)
      );
      expect(result.requestsInProgress.length).to.equal(1);
    });
  });
  describe("removeRequestInProgress", () => {
    it("removes request from requestsInProgress", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.GET_TEMPLATE],
        },
        removeRequestFromInProgress(AsyncRequest.GET_TEMPLATE)
      );
      expect(result.requestsInProgress).to.be.empty;
    });
  });
  describe("addEvent", () => {
    it("adds event to events", () => {
      const result = reducer(
        initialState,
        addEvent("foo", AlertType.ERROR, new Date())
      );
      expect(result.events.length).to.equal(1);
    });
  });
  describe("openSetMountPointNotification", () => {
    it("sets setMountPointNotificationVisible to true", () => {
      const result = reducer(initialState, openSetMountPointNotification());
      expect(result.setMountPointNotificationVisible).to.be.true;
    });
  });
  describe("closeSetMountPointNotification", () => {
    it("sets setMountPointNotificationVisible to false", () => {
      const result = reducer(
        {
          ...initialState,
          setMountPointNotificationVisible: true,
        },
        closeSetMountPointNotification()
      );
      expect(result.setMountPointNotificationVisible).to.be.false;
    });
  });
  describe("openModal", () => {
    it("adds modalName to visibleModals", () => {
      const result = reducer(initialState, openModal("openTemplate"));
      expect(result.visibleModals.length).to.equal(1);
    });
  });
  describe("closeModal", () => {
    it("removes modalName from visibleModals", () => {
      const result = reducer(
        { ...initialState, visibleModals: ["openTemplate"] },
        closeModal("openTemplate")
      );
      expect(result.visibleModals).to.be.empty;
    });
  });
  describe("openTemplateEditor", () => {
    it("adds templateEditor to visibleModals", () => {
      const result = reducer(initialState, openTemplateEditor());
      expect(result.visibleModals.includes("templateEditor")).to.be.true;
    });
    it("sets clearTemplateDraft as the deferredAction", () => {
      const result = reducer(initialState, openTemplateEditor());
      expect(result.deferredAction).to.deep.equal(clearTemplateDraft());
    });
    it("adds GET_TEMPLATE to requestsInProgress if payload is not falsy", () => {
      const result = reducer(initialState, openTemplateEditor(1));
      expect(result.requestsInProgress).includes(AsyncRequest.GET_TEMPLATE);
    });
    it("does not add GET_TEMPLATE to requestsInProgress if payload is not defined", () => {
      const result = reducer(initialState, openTemplateEditor());
      expect(result.requestsInProgress).not.includes(AsyncRequest.GET_TEMPLATE);
    });
  });
  describe("setDeferredAction", () => {
    it("sets deferredAction", () => {
      const result = reducer(
        initialState,
        setDeferredAction(setErrorAlert("foo"))
      );
      expect(result.deferredAction).to.not.be.undefined;
    });
  });
  describe("clearDeferredAction", () => {
    it("clears deferredAction", () => {
      const result = reducer(
        {
          ...initialState,
          deferredAction: setErrorAlert("foo"),
        },
        clearDeferredAction()
      );
      expect(result.deferredAction).to.be.undefined;
    });
  });
  describe("resetUpload", () => {
    it("closes setMountPointNotification", () => {
      const result = reducer(
        {
          ...initialState,
          setMountPointNotificationVisible: true,
          uploadError: "foo",
        },
        resetUpload()
      );
      expect(result.setMountPointNotificationVisible).to.be.false;
      expect(result.uploadError).to.be.undefined;
    });
  });
  describe("clearUploadError", () => {
    it("clears uploadError", () => {
      const result = reducer(
        { ...initialState, uploadError: "foo" },
        clearUploadError()
      );
      expect(result.uploadError).to.be.undefined;
    });
  });
  describe("viewUploads", () => {
    it("adds request in progress for GET_FILE_METADATA_FOR_JOB", () => {
      const result = reducer(
        initialState,
        viewUploads([mockSuccessfulUploadJob])
      );
      expect(
        result.requestsInProgress.includes(
          AsyncRequest.GET_FILE_METADATA_FOR_JOB
        )
      );
    });
  });
  describe("applyTemplate", () => {
    it("adds GET_TEMPLATE to requestsInProgress", () => {
      const result = reducer(initialState, applyTemplate(1));
      expect(result.requestsInProgress.includes(AsyncRequest.GET_TEMPLATE)).to
        .be.true;
    });
  });
  describe("setAppliedTemplate", () => {
    it("removes GET_TEMPLATE from requestsInProgress", () => {
      const result = reducer(
        { ...initialState, requestsInProgress: [AsyncRequest.GET_TEMPLATE] },
        setAppliedTemplate(mockMMSTemplate, {})
      );
      expect(result.requestsInProgress.includes(AsyncRequest.GET_TEMPLATE)).to
        .be.false;
    });
  });
  describe("saveTemplate", () => {
    it("adds SAVE_TEMPLATE to requestsInProgress", () => {
      const result = reducer(initialState, saveTemplate());
      expect(result.requestsInProgress.includes(AsyncRequest.SAVE_TEMPLATE)).to
        .be.true;
    });
  });
  describe("saveTemplateSucceeded", () => {
    it("removes SAVE_TEMPLATE from requestsInProgress, sets success alert, and closes template editor", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.SAVE_TEMPLATE],
          visibleModals: ["templateEditor"],
        },
        saveTemplateSucceeded(1)
      );
      expect(result.requestsInProgress).to.not.include(
        AsyncRequest.SAVE_TEMPLATE
      );
      expect(result.alert).to.deep.equal({
        message: "Template saved successfully!",
        type: AlertType.SUCCESS,
      });
      expect(result.visibleModals).to.not.include("templateEditor");
    });
  });
  describe("receiveJobs", () => {
    it("removes GET_JOBS from requestsInProgress", () => {
      const result = reducer(
        { ...initialState, requestsInProgress: [AsyncRequest.GET_JOBS] },
        receiveJobs([])
      );
      expect(!result.requestsInProgress.includes(AsyncRequest.GET_JOBS)).to.be
        .true;
    });
  });
  describe("receiveFSSJobCompletionUpdate", () => {
    it("adds async request to progress", () => {
      // Arrange
      const expectedRequest = `${AsyncRequest.COMPLETE_UPLOAD}-${mockFSSUploadJob.jobId}-${mockFSSUploadJob.status}`;

      // Act
      const actual = reducer(
        initialState,
        receiveFSSJobCompletionUpdate(mockFSSUploadJob)
      );

      // Assert
      expect(actual.requestsInProgress).to.deep.equal([expectedRequest]);
    });

    it("does not add duplicate requests", () => {
      // Arrange
      const expectedRequest = `${AsyncRequest.COMPLETE_UPLOAD}-${mockFSSUploadJob.jobId}-${mockFSSUploadJob.status}`;
      const state = {
        ...initialState,
        requestsInProgress: [expectedRequest],
      };

      // Act
      const actual = reducer(
        state,
        receiveFSSJobCompletionUpdate(mockFSSUploadJob)
      );

      // Assert
      expect(actual.requestsInProgress).to.deep.equal([expectedRequest]);
    });
  });
  describe("initiateUpload", () => {
    it("adds INITIATE_UPLOAD-jobName to requestsInProgress and sets info alert", () => {
      const result = reducer(initialState, initiateUpload());
      expect(result.requestsInProgress.includes("INITIATE_UPLOAD-foo"));
      expect(result.alert).to.deep.equal({
        message: "Starting upload",
        type: AlertType.INFO,
      });
    });
  });
  describe("initiateUploadSucceeded", () => {
    it("removes INITIATE_UPLOAD-jobName from requestsInProgress and clears uploadError", () => {
      const result = reducer(initialState, initiateUploadSucceeded("jobName"));
      expect(result.requestsInProgress).to.not.include(
        "INITIATE_UPLOAD-jobName"
      );
      expect(result.uploadError).to.be.undefined;
    });
  });
  describe("initiateUploadFailed", () => {
    it("removes INITIATE_UPLOAD-jobName from requestsInProgress and sets upload error", () => {
      const result = reducer(
        initialState,
        initiateUploadFailed("jobName", "some error")
      );
      expect(result.requestsInProgress).to.not.include(
        "INITIATE_UPLOAD-jobName"
      );
      expect(result.uploadError).to.equal("some error");
    });
  });
  describe("uploadSucceeded", () => {
    it("sets success alert", () => {
      const request = `${AsyncRequest.UPLOAD}-jobName`;
      const result = reducer(
        { ...initialState, requestsInProgress: [request] },
        uploadSucceeded("jobName")
      );
      expect(result.alert).to.deep.equal({
        message: "Upload jobName succeeded!",
        type: AlertType.SUCCESS,
      });
      expect(result.requestsInProgress).to.not.include(request);
    });
  });
  describe("uploadFailed", () => {
    it("sets error alert", () => {
      const request = `${AsyncRequest.UPLOAD}-jobName`;
      const result = reducer(
        { ...initialState, requestsInProgress: [request] },
        uploadFailed("error", "jobName")
      );
      expect(result.alert).to.deep.equal({
        message: "error",
        type: AlertType.ERROR,
      });
      expect(result.requestsInProgress).to.not.include(request);
    });
  });
  describe("retryUpload", () => {
    it("adds UPLOAD to requestsInProgress and sets info alert", () => {
      const result = reducer(
        initialState,
        retryUploads([
          {
            ...mockFailedUploadJob,
          },
        ])
      );
      expect(result.requestsInProgress).includes(
        `${AsyncRequest.UPLOAD}-${mockFailedUploadJob.jobName}`
      );
      expect(result.alert).to.deep.equal({
        message: "Retrying upload mockFailedUploadJob",
        type: AlertType.INFO,
      });
    });
  });
  describe("cancelUploads", () => {
    it("adds CANCEL_UPLOAD-jobName to requestsInProgress and sets info alert", () => {
      const requestType = `${AsyncRequest.CANCEL_UPLOAD}-foo`;
      const result = reducer(
        initialState,
        cancelUploads([
          {
            ...mockSuccessfulUploadJob,
            jobId: "foo",
          },
        ])
      );
      expect(result.requestsInProgress.includes(requestType));
      expect(result.alert).to.deep.equal({
        message: "Cancelling upload mockJob1",
        type: AlertType.INFO,
      });
    });
  });
  describe("cancelUploadSucceeded", () => {
    it("removes CANCEL_UPLOAD from requestsInProgress and sets success alert", () => {
      const requestType = `${AsyncRequest.CANCEL_UPLOAD}-foo`;
      const result = reducer(
        { ...initialState, requestsInProgress: [requestType] },
        cancelUploadSucceeded("foo")
      );
      expect(result.requestsInProgress.includes(requestType)).to.be.false;
      expect(result.alert).to.deep.equal({
        message: "Cancel upload foo succeeded",
        type: AlertType.SUCCESS,
      });
    });
  });
  describe("cancelUploadFailed", () => {
    it("removes CANCEL_UPLOAD from requestsInProgress and sets error alert", () => {
      const requestType = `${AsyncRequest.CANCEL_UPLOAD}-foo`;
      const result = reducer(
        { ...initialState, requestsInProgress: [AsyncRequest.CANCEL_UPLOAD] },
        cancelUploadFailed("jobName", "foo")
      );
      expect(result.requestsInProgress.includes(requestType)).to.be.false;
      expect(result.alert).to.deep.equal({
        message: "foo",
        type: AlertType.ERROR,
      });
    });
  });
  describe("startTemplateDraft", () => {
    it("removes GET_TEMPLATE from requestsInProgress", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.GET_TEMPLATE],
        },
        startTemplateDraft(mockMMSTemplate, mockTemplateDraft)
      );
      expect(result.requestsInProgress).not.includes(AsyncRequest.GET_TEMPLATE);
    });
  });
  describe("startTemplateDraftFailed", () => {
    it("removes GET_TEMPLATE from requestsInProgress", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.GET_TEMPLATE],
        },
        startTemplateDraftFailed("error")
      );
      expect(result.requestsInProgress).not.includes(AsyncRequest.GET_TEMPLATE);
    });
  });
  describe("submitFileMetadataUpdate", () => {
    it("adds AsyncRequest.UPDATE_FILE_METADATA-jobName to requestsInProgress", () => {
      const result = reducer(initialState, {
        ...submitFileMetadataUpdate(),
        payload: "jobName",
      });
      expect(result.requestsInProgress).to.include(
        `${AsyncRequest.UPDATE_FILE_METADATA}-jobName`
      );
    });
  });
  describe("editFileMetadataFailed", () => {
    it("sets error alert", () => {
      const result = reducer(
        initialState,
        editFileMetadataFailed("foo", "jobName")
      );
      expect(result.alert).to.deep.equal({
        message: "foo",
        type: AlertType.ERROR,
      });
    });
    it("removes UPDATE_FILE_METADATA-jobName from requestsInProgress", () => {
      const result = reducer(
        initialState,
        editFileMetadataFailed("foo", "jobName")
      );
      expect(
        result.requestsInProgress.includes(
          `${AsyncRequest.UPDATE_FILE_METADATA}-jobName`
        )
      ).to.be.false;
    });
  });
  describe("editFileMetadataSucceeded", () => {
    const jobName = "jobName";
    it("sets success alert", () => {
      const result = reducer(initialState, editFileMetadataSucceeded(jobName));
      expect(result.alert).to.deep.equal({
        message: "File metadata updated successfully!",
        type: AlertType.SUCCESS,
      });
    });
    it("removes UPDATE_FILE_METADATA from requestsInProgress", () => {
      const result = reducer(initialState, editFileMetadataSucceeded(jobName));
      expect(
        result.requestsInProgress.includes(
          `${AsyncRequest.UPDATE_FILE_METADATA}-${jobName}`
        )
      ).to.be.false;
    });
  });
  describe("openEditMetadataTabSucceeded", () => {
    it("removes GET_FILE_METADATA_FOR_JOB from requestsInProgress", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.GET_FILE_METADATA_FOR_JOB],
        },
        viewUploadsSucceeded(mockWellUpload)
      );
      expect(
        result.requestsInProgress.includes(
          AsyncRequest.GET_FILE_METADATA_FOR_JOB
        )
      ).to.be.false;
    });
  });
  describe("requestAnnotationUsage", () => {
    it("adds REQUEST_ANNOTATION_USAGE to requests", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.REQUEST_ANNOTATION_USAGE],
        },
        requestAnnotationUsage(1)
      );
      expect(
        result.requestsInProgress.includes(
          AsyncRequest.REQUEST_ANNOTATION_USAGE
        )
      ).to.be.true;
    });
  });
  describe("receiveAnnotationUsage", () => {
    it("removes REQUEST_ANNOTATION_USAGE from requests", () => {
      const result = reducer(
        {
          ...initialState,
          requestsInProgress: [AsyncRequest.REQUEST_ANNOTATION_USAGE],
        },
        receiveAnnotationUsage(1, false)
      );
      expect(
        result.requestsInProgress.includes(
          AsyncRequest.REQUEST_ANNOTATION_USAGE
        )
      ).to.be.false;
    });
  });
  describe("closeNotificationCenter", () => {
    it("marks all events as viewed", () => {
      const state: FeedbackStateBranch = {
        ...initialState,
        events: [
          {
            date: new Date("2020-10-30T10:45:00Z"),
            message: "Test warning",
            type: AlertType.WARN,
            viewed: false,
          },
          {
            date: new Date("2020-10-30T11:45:00Z"),
            message: "Test success",
            type: AlertType.SUCCESS,
            viewed: false,
          },
          {
            date: new Date("2020-10-30T12:45:00Z"),
            message: "Test error",
            type: AlertType.ERROR,
            viewed: false,
          },
          {
            date: new Date("2020-10-30T13:45:00Z"),
            message: "Test info",
            type: AlertType.INFO,
            viewed: false,
          },
          {
            date: new Date("2020-10-30T14:45:00Z"),
            message: "Test draft saved",
            type: AlertType.DRAFT_SAVED,
            viewed: false,
          },
        ],
      };

      const result = reducer(state, closeNotificationCenter());

      expect(result.events.every((event) => event.viewed)).to.be.true;
    });
  });
});

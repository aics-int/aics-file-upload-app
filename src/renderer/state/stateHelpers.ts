import { difference, get, omit } from "lodash";

import MMSClient from "../services/mms-client";
import { Template, TemplateAnnotation } from "../services/mms-client/types";
import { timeout } from "../util";

import { setSuccessAlert, setWarningAlert } from "./feedback/actions";
import {
  HTTP_STATUS,
  ReduxLogicNextCb,
  ReduxLogicTransformDependencies,
  UploadProgressInfo,
  UploadStateBranch,
} from "./types";

/*
 * This file contains helper methods that are used across our logics, and
 * possibly in other state management code like selectors as well. These helper
 * methods often depend on services, which differentiates them from pure utility
 * methods found in other files.
 */

// TODO: Why does this exist ???
export const handleUploadProgress = (
  fileNames: string[],
  onProgress: (progress: UploadProgressInfo) => void
) => {
  const copyProgress = new Map();
  fileNames.forEach((fileName: string) => {
    copyProgress.set(fileName, 0);
  });
  return (originalPath: string, bytesCopied: number, totalBytes: number) => {
    copyProgress.set(originalPath, bytesCopied);
    let completedBytes = 0;
    copyProgress.forEach((value: number) => {
      completedBytes += value;
    });
    const progress: UploadProgressInfo = {
      completedBytes,
      totalBytes,
    };
    onProgress(progress);
  };
};

// every annotation will be stored in an array, regardless of whether it can have multiple values or not
export const pivotAnnotations = (
  annotations: TemplateAnnotation[],
  booleanAnnotationTypeId: number
) => {
  return annotations.reduce(
    (accum: any, a: TemplateAnnotation) => ({
      ...accum,
      // Default to `false` for boolean values
      [a.name]: a.annotationTypeId === booleanAnnotationTypeId ? [false] : [],
    }),
    {}
  );
};

// TODO: It's unclear which file this function should live in. It dispatches
// actions from the `feedback` branch of the store, but it is used in many
// different logics. This seems to be the best option for now.
/**
 * Wrapper for async requests that retries non-OK requests related to VPN issues and service deployments
 * Dispatches warning if it needs to retry and success if it retried and succeeded before reaching 5 tries
 * Waits 10 sec between tries
 * @param request function that returns a promise
 * @param dispatch Redux Logic dispatch call back (must be in process)
 */
export async function getWithRetry<T = any>(
  request: () => Promise<T>,
  dispatch: ReduxLogicNextCb
): Promise<T> {
  const SERVICE_IS_DOWN_MESSAGE =
    "Could not contact server. Make sure services are running.";
  const SERVICE_MIGHT_BE_DOWN_MESSAGE =
    "Services might be down. Retrying request...";
  const CANNOT_FIND_ADDRESS = "ENOTFOUND";
  const RETRY_INTERVAL = 10000; // ms
  const NUM_TRIES = 5;

  let triesLeft = NUM_TRIES;
  let sentRetryAlert = false;
  let response: T | undefined;
  let error: string | undefined;
  let receivedNonRetryableError = false;

  while (triesLeft > 0 && !response && !receivedNonRetryableError) {
    try {
      triesLeft--;
      response = await request();
    } catch (e) {
      // Retry if we get a Bad Gateway. This is common when a server goes down during deployment.
      // Retrying requests where the host could not be resolved. This is common for VPN issues.
      if (
        e.response?.status === HTTP_STATUS.BAD_GATEWAY ||
        e.code === CANNOT_FIND_ADDRESS
      ) {
        if (!sentRetryAlert) {
          const message =
            e.response?.status === HTTP_STATUS.BAD_GATEWAY
              ? `Could not contact server. Make sure services are running.`
              : SERVICE_MIGHT_BE_DOWN_MESSAGE;
          dispatch(setWarningAlert(message));
          sentRetryAlert = true;
        }
        await timeout(RETRY_INTERVAL);
      } else {
        receivedNonRetryableError = true;
        error = get(e, ["response", "data", "error"], e.message);
      }
    }
  }

  if (response) {
    if (sentRetryAlert) {
      dispatch(setSuccessAlert("Success!"));
    }
    return response;
  } else {
    let message = "Unknown error";
    if (sentRetryAlert) {
      message = SERVICE_IS_DOWN_MESSAGE;
    } else if (error) {
      message = error;
    }
    throw new Error(message);
  }
}

interface ApplyTemplateInfo {
  template: Template;
  uploads: UploadStateBranch;
}

/***
 * Helper that gets the template by id from MMS and returns template and updated uploads
 * @param {number} templateId
 * @param {MMSClient} mmsClient
 * @param {ReduxLogicNextCb} dispatch
 * @param {number} booleanAnnotationTypeId boolean annotation type id
 * @param {object | undefined} upload to apply template annotations to
 * @param {Template | undefined} prevAppliedTemplate previously applied template this is to retain
 * any information they may have entered for an upload for an annotation that exists on the new template
 * @returns {Promise<ApplyTemplateInfo>} info needed for setting applied template
 */
export const getApplyTemplateInfo = async (
  templateId: number,
  mmsClient: MMSClient,
  dispatch: ReduxLogicNextCb,
  booleanAnnotationTypeId: number,
  upload?: UploadStateBranch,
  prevAppliedTemplate?: Template
): Promise<ApplyTemplateInfo> => {
  const previousTemplateAnnotationNames = prevAppliedTemplate
    ? prevAppliedTemplate.annotations.map((a) => a.name)
    : [];

  const template: Template = await getWithRetry(
    () => mmsClient.getTemplate(templateId),
    dispatch
  );
  const { annotations } = template;
  const annotationsToExclude = difference(
    previousTemplateAnnotationNames,
    annotations.map((a) => a.name)
  );
  const additionalAnnotations = pivotAnnotations(
    annotations,
    booleanAnnotationTypeId
  );
  const uploads = Object.entries(upload || {}).reduce(
    (accum, [key, metadata]) => ({
      ...accum,
      [key]: {
        ...additionalAnnotations,
        ...omit(metadata, annotationsToExclude),
      },
    }),
    {} as UploadStateBranch
  );
  return { template, uploads };
};

/**
 * Helper function for logics that need to ensure that user has a chance
 * to save their upload before the upload potentially gets updated.
 * Examples include: close upload tab, editing an upload, opening an upload, saving an upload.
 * @param deps redux logic transform dependencies
 * @param canSaveUploadDraft whether the upload draft can be saved
 * @param currentUploadFilePath current file path that the current upload is saved to, if present
 * @param skipWarningDialog whether or not to warn users that if they don't save, their draft will be discarded.
 * This won't be necessary if the user explicitly saves the draft (i.e. File > Save)
 * Returns promise of object { cancelled: boolean, filePath?: string } where cancelled indicates whether
 * to continue with this action (if cancelled is true - logics should reject) and filePath represents
 * the file that user chose to save their draft to - this will be undefined if the user cancels saving.
 */
export const ensureDraftGetsSaved = async (
  deps: ReduxLogicTransformDependencies,
  canSaveUploadDraft: boolean,
  currentUploadFilePath: string | undefined,
  skipWarningDialog = false
): Promise<{
  cancelled: boolean; // User decides they want to continue working on the current upload draft
  filePath?: string; // Where user saved the upload draft
}> => {
  const CANCEL_BUTTON_INDEX = 0;
  const DISCARD_BUTTON_INDEX = 1;
  const SAVE_UPLOAD_DRAFT_BUTTON_INDEX = 2;

  const { dialog, getState, writeFile } = deps;

  // if currentUploadFilePath is set, user is working on a upload draft that
  // they have saved before. Now we just need to save to that file.
  if (currentUploadFilePath) {
    await writeFile(currentUploadFilePath, JSON.stringify(getState()));
    return { cancelled: false, filePath: currentUploadFilePath };
  } else if (canSaveUploadDraft) {
    // figure out if user wants to save their draft before we replace it
    let buttonIndex = SAVE_UPLOAD_DRAFT_BUTTON_INDEX;
    if (!skipWarningDialog) {
      const { response } = await dialog.showMessageBox({
        buttons: ["Cancel", "Discard", "Save Upload Draft"],
        cancelId: CANCEL_BUTTON_INDEX,
        defaultId: SAVE_UPLOAD_DRAFT_BUTTON_INDEX,
        message: "Your draft will be discarded unless you save it.",
        title: "Warning",
        type: "question",
      });
      buttonIndex = response;
    }

    if (buttonIndex === DISCARD_BUTTON_INDEX) {
      // Discard Draft but continue doing what it was we were doing
      return {
        cancelled: false,
        filePath: undefined,
      };
    } else if (buttonIndex === SAVE_UPLOAD_DRAFT_BUTTON_INDEX) {
      try {
        // Save Upload Draft
        const { filePath } = await dialog.showSaveDialog({
          title: "Save Upload Draft",
          filters: [{ name: "JSON", extensions: ["json"] }],
        });
        if (filePath) {
          await writeFile(filePath, JSON.stringify(getState()));
        }

        return {
          cancelled: false,
          filePath,
        };
      } catch (e) {
        throw new Error(`Could not save draft: ${e.message}`);
      }
    } else {
      return {
        cancelled: true,
        filePath: undefined,
      };
    }
  }
  return {
    cancelled: false,
    filePath: undefined,
  };
};

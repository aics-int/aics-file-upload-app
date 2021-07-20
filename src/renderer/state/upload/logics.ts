import { basename, extname } from "path";

import {
  castArray,
  chunk,
  flatMap,
  forEach,
  get,
  includes,
  isEmpty,
  isNil,
  trim,
  values,
} from "lodash";
import { isDate, isMoment } from "moment";
import { createLogic } from "redux-logic";

import { AnnotationName, LIST_DELIMITER_SPLIT } from "../../constants";
import FileManagementSystem from "../../services/fms-client";
import { CopyCancelledError } from "../../services/fms-client/CopyCancelledError";
import { StartUploadResponse } from "../../services/fss-client";
import { AnnotationType, ColumnType } from "../../services/labkey-client/types";
import { Template } from "../../services/mms-client/types";
import { UploadRequest } from "../../services/types";
import {
  determineFilesFromNestedPaths,
  ensureDraftGetsSaved,
  getApplyTemplateInfo,
  pivotAnnotations,
  splitTrimAndFilter,
} from "../../util";
import { requestFailed } from "../actions";
import { setErrorAlert } from "../feedback/actions";
import { updateUploadProgressInfo } from "../job/actions";
import {
  getAnnotationTypes,
  getBooleanAnnotationTypeId,
  getCurrentUploadFilePath,
} from "../metadata/selectors";
import { closeUpload, viewUploads, resetUpload } from "../route/actions";
import {
  handleStartingNewUploadJob,
  resetHistoryActions,
} from "../route/logics";
import {
  setPlateBarcodeToImagingSessions,
  updateMassEditRow,
} from "../selection/actions";
import {
  getMassEditRow,
  getPlateBarcodeToImagingSessions,
  getSelectedUploads,
} from "../selection/selectors";
import { getTemplateId } from "../setting/selectors";
import { setAppliedTemplate } from "../template/actions";
import { getAppliedTemplate } from "../template/selectors";
import {
  AsyncRequest,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependenciesWithAction,
  UploadProgressInfo,
  UploadStateBranch,
  FileModel,
} from "../types";
import { batchActions, handleUploadProgress } from "../util";

import {
  addUploadFiles,
  applyTemplate,
  cancelUploadFailed,
  cancelUploadSucceeded,
  editFileMetadataFailed,
  editFileMetadataSucceeded,
  initiateUploadFailed,
  initiateUploadSucceeded,
  removeUploads,
  saveUploadDraftSuccess,
  updateUploads,
  uploadFailed,
} from "./actions";
import {
  ADD_UPLOAD_FILES,
  APPLY_TEMPLATE,
  CANCEL_UPLOADS,
  getUploadRowKey,
  INITIATE_UPLOAD,
  isSubImageOnlyRow,
  OPEN_UPLOAD_DRAFT,
  RETRY_UPLOADS,
  SAVE_UPLOAD_DRAFT,
  SUBMIT_FILE_METADATA_UPDATE,
  UPDATE_SUB_IMAGES,
  UPDATE_UPLOAD,
  UPDATE_UPLOAD_ROWS,
  UPLOAD_WITHOUT_METADATA,
} from "./constants";
import {
  extensionToFileTypeMap,
  getCanSaveUploadDraft,
  getUpload,
  getUploadFileNames,
  getUploadRequests,
} from "./selectors";
import {
  ApplyTemplateAction,
  CancelUploadAction,
  FileType,
  InitiateUploadAction,
  OpenUploadDraftAction,
  RetryUploadAction,
  SaveUploadDraftAction,
  SubmitFileMetadataUpdateAction,
  UpdateSubImagesAction,
  UpdateUploadAction,
  UpdateUploadRowsAction,
  UploadWithoutMetadataAction,
} from "./types";

const applyTemplateLogic = createLogic({
  process: async (
    {
      action,
      getState,
      mmsClient,
    }: ReduxLogicProcessDependenciesWithAction<ApplyTemplateAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const templateId = action.payload;
    const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());
    if (!booleanAnnotationTypeId) {
      dispatch(
        requestFailed(
          "Boolean annotation type id not found. Contact Software.",
          AsyncRequest.GET_TEMPLATE
        )
      );
      done();
      return;
    }
    try {
      const { template, uploads } = await getApplyTemplateInfo(
        templateId,
        mmsClient,
        dispatch,
        booleanAnnotationTypeId,
        getUpload(getState()),
        getAppliedTemplate(getState())
      );
      dispatch(setAppliedTemplate(template, uploads));
    } catch (e) {
      dispatch(
        requestFailed(
          `Could not apply template: ${get(
            e,
            ["response", "data", "error"],
            e.message
          )}`,
          AsyncRequest.GET_TEMPLATE
        )
      );
    }
    done();
  },
  type: APPLY_TEMPLATE,
});

const addUploadFilesLogic = createLogic({
  process: (
    { getState }: ReduxLogicProcessDependencies,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const selectedTemplate = getAppliedTemplate(getState())?.templateId;
    const savedTemplate = getTemplateId(getState());
    if (selectedTemplate) {
      dispatch(applyTemplate(selectedTemplate));
    } else if (savedTemplate) {
      dispatch(applyTemplate(savedTemplate));
    }
    done();
  },
  type: ADD_UPLOAD_FILES,
});

const initiateUploadLogic = createLogic({
  process: async (
    {
      action,
      fms,
      getState,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<InitiateUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const groupId = FileManagementSystem.createUniqueId();
    let initiateUploadResults;
    try {
      initiateUploadResults = await Promise.all(
        getUploadRequests(getState()).map(async (request) => {
          const response = await fms.startUpload(
            request.file.originalPath,
            request,
            { groupId }
          );
          return { request, response };
        })
      );
    } catch (e) {
      // If we are unable to validate metadata or get the directory to copy
      // to then we need to alert the user ASAP otherwise this data
      // will be lost
      dispatch(
        initiateUploadFailed(
          action.payload,
          e.message || "Upload failed to start, " + e
        )
      );
      done();
      return;
    }

    dispatch(initiateUploadSucceeded(action.payload));
    // Reset redo/undo logic
    dispatch(batchActions([...resetHistoryActions]));

    // Upload 25 files at a time to prevent performance issues in the case of
    // uploads with many files.
    for (const batch of chunk(initiateUploadResults, 25)) {
      await Promise.all(
        batch.map(async (result) => {
          const jobName = basename(result.request.file.originalPath);
          try {
            await fms.uploadFile(
              result.response.jobId,
              result.request.file.originalPath,
              result.request,
              result.response.uploadDirectory,
              handleUploadProgress(
                [result.request.file.originalPath],
                (progress: UploadProgressInfo) =>
                  dispatch(
                    updateUploadProgressInfo(result.response.jobId, progress)
                  )
              )
            );
          } catch (e) {
            if (!(e instanceof CopyCancelledError)) {
              const error = `Upload ${jobName} failed: ${e.message}`;
              logger.error(`Upload failed`, e);
              dispatch(uploadFailed(error, jobName));
            }
          }
        })
      );
    }
    done();
  },
  transform: (
    {
      action,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<InitiateUploadAction>,
    next: ReduxLogicNextCb
  ) => {
    next({
      ...action,
      payload: getUploadFileNames(getState()).join(", "),
    });
  },
  type: INITIATE_UPLOAD,
  warnTimeout: 0,
});

export const cancelUploadsLogic = createLogic({
  process: async (
    {
      action,
      fms,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<CancelUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const jobs = action.payload;
    await Promise.all(
      jobs.map(async (job) => {
        try {
          await fms.cancelUpload(job.jobId);
          dispatch(cancelUploadSucceeded(job.jobName || ""));
        } catch (e) {
          logger.error(`Cancel upload failed`, e);
          dispatch(
            cancelUploadFailed(
              job.jobName || "",
              `Cancel upload ${job.jobName} failed: ${e.message}`
            )
          );
        }
      })
    );
    done();
  },
  type: CANCEL_UPLOADS,
});

const retryUploadsLogic = createLogic({
  process: async (
    {
      action,
      fms,
      logger,
    }: ReduxLogicProcessDependenciesWithAction<RetryUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const jobs = action.payload;
    await Promise.all(
      jobs.map(async (job) => {
        const fileNames =
          job.serviceFields?.files.map(({ file }) => file.fileName || "") || [];
        try {
          await fms.retryUpload(job.jobId, (jobId) =>
            handleUploadProgress(fileNames, (progress: UploadProgressInfo) =>
              dispatch(updateUploadProgressInfo(jobId, progress))
            )
          );
        } catch (e) {
          if (!(e instanceof CopyCancelledError)) {
            const error = `Retry upload ${job.jobName} failed: ${e.message}`;
            logger.error(`Retry for jobId=${job.jobId} failed`, e);
            dispatch(uploadFailed(error, job.jobName || ""));
          }
        }
      })
    );
    done();
  },
  type: RETRY_UPLOADS,
  warnTimeout: 0,
});

const getSubImagesAndKey = (
  positionIndexes: number[],
  scenes: number[],
  subImageNames: string[]
) => {
  let subImages: Array<string | number> = positionIndexes;
  let subImageKey: keyof UploadRequest = "positionIndex";
  if (isEmpty(subImages)) {
    subImages = scenes;
    subImageKey = "scene";
  }
  if (isEmpty(subImages)) {
    subImages = subImageNames;
    subImageKey = "subImageName";
  }
  subImages = subImages || [];
  return {
    subImageKey,
    subImages,
  };
};

// This handles the event where a user adds subimages in the form of positions/scenes/names (only one type allowed)
// and/or channels.
// When this happens we want to:
// (1) delete rows representing subimages and channels that we no longer care about
// (2) create new rows for subimages and channels that are new
// (3) remove wells from file row if a sub image was added.
// For rows containing subimage or channel information that was previously there, we do nothing, as to save
// anything that user has entered for that row.
const updateSubImagesLogic = createLogic({
  type: UPDATE_SUB_IMAGES,
  validate: (
    {
      action,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<UpdateSubImagesAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const {
      channelIds,
      positionIndexes,
      row: fileRow,
      scenes,
      subImageNames,
    } = action.payload;
    const fileRowKey = getUploadRowKey(fileRow);
    let notEmptySubImageParams = 0;
    if (!isEmpty(positionIndexes)) {
      notEmptySubImageParams++;
    }

    if (!isEmpty(scenes)) {
      notEmptySubImageParams++;
    }

    if (!isEmpty(subImageNames)) {
      notEmptySubImageParams++;
    }

    if (notEmptySubImageParams > 1) {
      reject(
        setErrorAlert(
          "Could not update sub images. Found more than one type of subImage in request"
        )
      );
      return;
    }

    const { subImageKey, subImages } = getSubImagesAndKey(
      positionIndexes,
      scenes,
      subImageNames
    );
    const update: Partial<UploadStateBranch> = {};

    const uploads = getUpload(getState());
    const existingUploadsForFile = values(uploads).filter(
      (u) => u.file === fileRow.file
    );

    const template = getAppliedTemplate(getState());

    if (!template) {
      next(
        setErrorAlert(
          "Could not get applied template while attempting to update file sub images. Contact Software."
        )
      );
      return;
    }

    const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());
    if (!booleanAnnotationTypeId) {
      next(
        setErrorAlert("Could not get boolean annotation type. Contact Software")
      );
      return;
    }

    const additionalAnnotations = pivotAnnotations(
      template.annotations,
      booleanAnnotationTypeId
    );

    // If there are subimages for a file, remove the well associations from the file row
    // Also add channels as an annotation
    if (!isEmpty(subImages)) {
      update[fileRowKey] = {
        ...uploads[fileRowKey],
        [AnnotationName.WELL]: [],
        ...(channelIds.length && {
          [AnnotationName.CHANNEL_TYPE]: channelIds,
        }),
      };
    }

    // add channel rows that are new
    const oldChannelIds = fileRow.channelIds || [];
    channelIds
      .filter((c: string) => !includes(oldChannelIds, c))
      .forEach((channelId: string) => {
        const key = getUploadRowKey({
          file: fileRow.file,
          channelId,
        });
        update[key] = {
          channelId,
          file: fileRow.file,
          [AnnotationName.NOTES]: [],
          positionIndex: undefined,
          scene: undefined,
          subImageName: undefined,
          [AnnotationName.WELL]: [],
          ...additionalAnnotations,
        };
      });

    // add uploads that are new
    subImages.forEach((subImageValue: string | number) => {
      const matchingSubImageRow = existingUploadsForFile
        .filter(isSubImageOnlyRow)
        .find((u) => u[subImageKey] === subImageValue);

      if (!matchingSubImageRow) {
        const subImageOnlyRowKey = getUploadRowKey({
          file: fileRow.file,
          [subImageKey]: subImageValue,
        });
        update[subImageOnlyRowKey] = {
          channelId: undefined,
          file: fileRow.file,
          [AnnotationName.NOTES]: [],
          [AnnotationName.WELL]: [],
          [subImageKey]: subImageValue,
          ...additionalAnnotations,
        };
      }

      channelIds.forEach((channelId: string) => {
        const matchingChannelRow = existingUploadsForFile.find(
          (u) =>
            u.channelId &&
            u.channelId === channelId &&
            u[subImageKey] === subImageValue
        );

        if (!matchingChannelRow) {
          const key = getUploadRowKey({
            channelId: channelId,
            file: fileRow.file,
            [subImageKey]: subImageValue,
          });
          update[key] = {
            channelId,
            file: fileRow.file,
            [AnnotationName.NOTES]: [],
            [AnnotationName.WELL]: [],
            [subImageKey]: subImageValue,
            ...additionalAnnotations,
          };
        }
      });
    });

    // delete the uploads that don't exist anymore
    const rowKeysToDelete = existingUploadsForFile
      .filter(
        (u) =>
          (!isNil(u.positionIndex) &&
            !includes(positionIndexes, u.positionIndex)) ||
          (!isNil(u.scene) && !includes(scenes, u.scene)) ||
          (!isNil(u.subImageName) &&
            !includes(subImageNames, u.subImageName)) ||
          (!isNil(u.channelId) && !includes(channelIds, u.channelId))
      )
      .map(({ file, positionIndex, channelId, scene, subImageName }) =>
        getUploadRowKey({
          channelId,
          file,
          positionIndex,
          scene,
          subImageName,
        })
      );
    next(
      batchActions([
        action,
        updateUploads(update),
        removeUploads(rowKeysToDelete),
      ])
    );
  },
});

const parseStringArray = (input: string[]): string[] =>
  flatMap(input, splitTrimAndFilter);

const parseNumberArray = (input: string[]): number[] => {
  return input.reduce((filtered: number[], next: string) => {
    return [
      ...filtered,
      ...`${next}`
        .split(LIST_DELIMITER_SPLIT)
        .map((v) => Number(trim(v)))
        .filter((v) => !Number.isNaN(v)),
    ];
  }, []);
};

// antd's DatePicker passes a moment object rather than Date so we convert back here
// sometimes the input is invalid and does not get converted to a moment object so
// we're typing it as any
const convertDatePickerValueToDate = (d: any) => {
  if (isDate(d)) {
    return d;
  } else if (isMoment(d)) {
    return d.toDate();
  } else {
    return undefined;
  }
};

// Here we take care of custom inputs that handle arrays for strings and numbers.
// If we can create a valid array from the text of the input, we'll transform it into an array
// if not, we pass the value untouched to the reducer.
// Additionally we take care of converting moment dates back to dates.
function formatUpload(
  upload: Partial<FileModel>,
  template: Template,
  annotationTypes: AnnotationType[]
) {
  const formattedUpload: Partial<FileModel> = {};
  forEach(upload, (value: any, key: string) => {
    const annotation = template.annotations.find((a) => a.name === key);

    if (annotation) {
      const annotationType = annotationTypes.find(
        (at) => at.annotationTypeId === annotation.annotationTypeId
      );

      if (annotationType) {
        const type = annotationType.name;
        const endsWithComma = trim(value).endsWith(",");

        if (type === ColumnType.DATETIME || type === ColumnType.DATE) {
          value = (value ? castArray(value) : [])
            .map(convertDatePickerValueToDate)
            .filter((d: any) => !isNil(d));
        } else if (type === ColumnType.NUMBER && !endsWithComma) {
          value = parseNumberArray(
            castArray(value).filter((v) => !isNil(v) && v !== "")
          );
        } else if (type === ColumnType.TEXT && !endsWithComma) {
          value = parseStringArray(
            castArray(value).filter((v) => !isNil(v) && v !== "")
          );
        }
      }
    }

    formattedUpload[key] = value;
  });

  return formattedUpload;
}

const updateUploadLogic = createLogic({
  process: async (
    deps: ReduxLogicProcessDependenciesWithAction<UpdateUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const { upload } = deps.action.payload;

    // If a plate barcode is being updated check for imaging sessions
    const plateBarcode = upload[AnnotationName.PLATE_BARCODE]?.[0];
    if (plateBarcode) {
      const plateBarcodeToImagingSessions = getPlateBarcodeToImagingSessions(
        deps.getState()
      );
      // Avoid re-querying for the imaging sessions if this
      // plate barcode has been selected before
      if (!Object.keys(plateBarcodeToImagingSessions).includes(plateBarcode)) {
        // TODO: Why not find by name
        const imagingSessionsForPlateBarcode = await deps.labkeyClient.findImagingSessionsByPlateBarcode(
          plateBarcode
        );
        const imagingSessionsWithPlateInfo = await Promise.all(
          imagingSessionsForPlateBarcode.map(async (is) => {
            const platesAndWells = await deps.mmsClient.getPlate(
              plateBarcode,
              is && is["ImagingSessionId"]
            );

            // TODO: What do we actually use from this?
            return {
              ...platesAndWells,
              imagingSessionId: is["ImagingSessionId"],
              name: is["ImagingSessionId/Name"],
            };
          })
        );

        dispatch(
          setPlateBarcodeToImagingSessions({
            ...plateBarcodeToImagingSessions,
            [plateBarcode]: imagingSessionsWithPlateInfo.reduce(
              (accum, is) => ({
                ...accum,
                [is.imagingSessionId]: is,
              })
            ),
          })
        );
      }
    }

    done();
  },
  transform: (
    {
      action,
      getState,
      logger,
    }: ReduxLogicTransformDependenciesWithAction<UpdateUploadAction>,
    next: ReduxLogicNextCb
  ) => {
    const { upload } = action.payload;
    const state = getState();
    const template = getAppliedTemplate(state);
    const isMassEditing = getMassEditRow(state);
    const annotationTypes = getAnnotationTypes(state);

    if (!template || !annotationTypes) {
      next(action);
    } else {
      try {
        const formattedUpload = formatUpload(upload, template, annotationTypes);
        if (isMassEditing) {
          next(updateMassEditRow(formattedUpload));
        } else {
          next({
            ...action,
            payload: {
              ...action.payload,
              upload: formattedUpload,
            },
          });
        }
      } catch (e) {
        logger.error(
          "Something went wrong while updating metadata: ",
          e.message
        );
      }
    }
  },
  type: UPDATE_UPLOAD,
});

const updateUploadRowsLogic = createLogic({
  transform: (
    {
      action,
      getState,
    }: ReduxLogicTransformDependenciesWithAction<UpdateUploadRowsAction>,
    next: ReduxLogicNextCb
  ) => {
    const { uploadKeys, metadataUpdate } = action.payload;
    const state = getState();
    const template = getAppliedTemplate(state);
    const annotationTypes = getAnnotationTypes(state);

    // Format update if template and annotation types are present
    const formattedUpdate =
      template && annotationTypes
        ? formatUpload(metadataUpdate, template, annotationTypes)
        : metadataUpdate;

    const updatedAction: UpdateUploadRowsAction = {
      ...action,
      payload: {
        metadataUpdate: formattedUpdate,
        uploadKeys,
      },
    };
    next(updatedAction);
  },
  type: UPDATE_UPLOAD_ROWS,
});

// Saves what is currently in the upload wizard tab whether a new upload in progress or
// a draft that was saved previously
const saveUploadDraftLogic = createLogic({
  type: SAVE_UPLOAD_DRAFT,
  validate: async (
    deps: ReduxLogicTransformDependenciesWithAction<SaveUploadDraftAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { action, getState } = deps;
    try {
      const { cancelled, filePath } = await ensureDraftGetsSaved(
        deps,
        getCanSaveUploadDraft(getState()),
        getCurrentUploadFilePath(getState()),
        true
      );
      if (cancelled || !filePath) {
        // don't let this action get to the reducer
        reject({ type: "ignore" });
        return;
      }
      const currentUploadFilePath = action.payload ? filePath : undefined;
      next(saveUploadDraftSuccess(currentUploadFilePath));
    } catch (e) {
      reject(setErrorAlert(e.message));
      return;
    }
  },
});

const openUploadLogic = createLogic({
  process: (
    {
      ctx,
      logger,
      getApplicationMenu,
      getState,
    }: ReduxLogicProcessDependenciesWithAction<OpenUploadDraftAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    // TODO: Make sure changing pages and opening drafts resets state
    dispatch(
      batchActions(
        handleStartingNewUploadJob(logger, getState(), getApplicationMenu)
      )
    );

    const { draft } = ctx;
    const uploadFilesFromDraft = getUpload(draft);
    try {
      dispatch(addUploadFiles(Object.values(uploadFilesFromDraft)));
    } catch (e) {
      dispatch(setErrorAlert(`Encountered error while resolving files: ${e}`));
    }

    done();
  },
  type: OPEN_UPLOAD_DRAFT,
  validate: async (
    deps: ReduxLogicTransformDependenciesWithAction<OpenUploadDraftAction>,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { action, ctx, dialog, getState, readFile } = deps;
    try {
      const { cancelled } = await ensureDraftGetsSaved(
        deps,
        getCanSaveUploadDraft(getState()),
        getCurrentUploadFilePath(getState())
      );
      if (cancelled) {
        reject({ type: "ignore" });
        return;
      }
    } catch (e) {
      reject(setErrorAlert(e.message));
      return;
    }

    try {
      const { filePaths } = await dialog.showOpenDialog({
        filters: [{ name: "JSON", extensions: ["json"] }],
        properties: ["openFile"],
      });
      if (filePaths && filePaths[0]) {
        ctx.filePath = filePaths[0];
      } else {
        // user cancelled
        reject({ type: "ignore" });
        return;
      }
    } catch (e) {
      reject(setErrorAlert(`Could not open file: ${e.message}`));
    }

    try {
      ctx.draft = JSON.parse((await readFile(ctx.filePath, "utf8")) as string);
      const selectedUploads = getSelectedUploads(ctx.draft);
      if (selectedUploads.length) {
        // If selectedUploads exists on the draft, we know that the upload has been submitted before
        // and we actually want to edit it. This will go through the viewUploads logics instead.
        reject(viewUploads(selectedUploads));
      } else {
        next(action);
      }
    } catch (e) {
      reject(setErrorAlert(`Could not open draft: ${e.message}`));
      return;
    }
  },
});

const submitFileMetadataUpdateLogic = createLogic({
  process: async (
    {
      getState,
      mmsClient,
      jssClient,
    }: ReduxLogicProcessDependenciesWithAction<SubmitFileMetadataUpdateAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const selectedUploads = getSelectedUploads(getState());
    const combinedNames = selectedUploads.map((u) => u.jobName).join(", ");
    const editFileMetadataRequests = getUploadRequests(getState());
    try {
      await Promise.all(
        editFileMetadataRequests.map((request) =>
          mmsClient.editFileMetadata(request.file.fileId, request)
        )
      );
      // This serves to update the "My Uploads" tables so that uploads without templates
      // may now have templates after the edit
      await Promise.all(
        editFileMetadataRequests.map((request) => {
          const matchingUpload = selectedUploads.find((u) =>
            u.serviceFields?.result?.find(
              (f) => f.fileId === request.file.fileId
            )
          );
          if (!matchingUpload) {
            dispatch(
              editFileMetadataFailed(
                `Could not update upload job for file ${request.file.fileName}`,
                request.file.fileName || ""
              )
            );
            return;
          }
          return jssClient.updateJob(matchingUpload.jobId, {
            serviceFields: { files: [request] },
          });
        })
      );
    } catch (e) {
      const message = e?.response?.data?.error || e.message;
      dispatch(
        editFileMetadataFailed("Could not edit file: " + message, combinedNames)
      );
      done();
      return;
    }

    dispatch(
      batchActions([
        editFileMetadataSucceeded(combinedNames),
        closeUpload(),
        resetUpload(),
      ])
    );
    done();
  },
  type: SUBMIT_FILE_METADATA_UPDATE,
});

const uploadWithoutMetadataLogic = createLogic({
  process: async (
    deps: ReduxLogicProcessDependenciesWithAction<UploadWithoutMetadataAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    let filePaths;
    try {
      filePaths = await determineFilesFromNestedPaths(deps.action.payload);
    } catch (err) {
      const error = `Failed resolving files: ${err.message}`;
      dispatch(uploadFailed(error, deps.action.payload.join(", ")));
      done();
      return;
    }

    // Perform initiate upload results all at once first so that jobs appear
    // in the user uploads as in progress
    const groupId = FileManagementSystem.createUniqueId();
    const initiateUploadResults = await Promise.all(
      filePaths.map(async (filePath) => {
        const request = {
          file: {
            disposition: "tape", // prevent czi -> ome.tiff conversions
            fileType:
              extensionToFileTypeMap[extname(filePath).toLowerCase()] ||
              FileType.OTHER,
            originalPath: filePath,
            shouldBeInArchive: true,
            shouldBeInLocal: true,
          },
          microscopy: {},
        };
        try {
          const response = await deps.fms.startUpload(filePath, request, {
            groupId,
          });
          return { request, response };
        } catch (err) {
          const fileName = basename(filePath);
          const error = `Upload ${fileName} failed: ${err.message}`;
          dispatch(uploadFailed(error, fileName));
          return null;
        }
      })
    );

    // Remove already failed uploads from list
    const successfulResults = initiateUploadResults.filter((r) => !!r) as {
      request: UploadRequest;
      response: StartUploadResponse;
    }[];

    // Upload 25 files at a time to prevent performance issues in the case of
    // uploads with many files.
    for (const batch of chunk(successfulResults, 25)) {
      await Promise.all(
        batch.map(async ({ request, response }) => {
          try {
            await deps.fms.uploadFile(
              response.jobId,
              request.file.originalPath,
              request,
              response.uploadDirectory,
              handleUploadProgress(
                [request.file.originalPath],
                (progress: UploadProgressInfo) =>
                  dispatch(updateUploadProgressInfo(response.jobId, progress))
              )
            );
          } catch (err) {
            if (!(err instanceof CopyCancelledError)) {
              const fileName = basename(request.file.originalPath);
              const error = `Upload ${fileName} failed: ${err.message}`;
              deps.logger.error(`Upload failed`, err);
              dispatch(uploadFailed(error, fileName));
            }
          }
        })
      );
    }

    done();
  },
  type: UPLOAD_WITHOUT_METADATA,
});

export default [
  addUploadFilesLogic,
  applyTemplateLogic,
  cancelUploadsLogic,
  initiateUploadLogic,
  openUploadLogic,
  retryUploadsLogic,
  saveUploadDraftLogic,
  submitFileMetadataUpdateLogic,
  updateSubImagesLogic,
  updateUploadLogic,
  updateUploadRowsLogic,
  uploadWithoutMetadataLogic,
];

import * as fs from "fs";
import * as path from "path";

import {
  castArray,
  flatMap,
  forEach,
  get,
  isNil,
  trim,
} from "lodash";
import { isDate, isMoment } from "moment";
import { createLogic } from "redux-logic";

import { RendererProcessEvents } from "../../../shared/constants";
import { AnnotationName, LIST_DELIMITER_SPLIT } from "../../constants";
import BatchedTaskQueue from "../../entities/BatchedTaskQueue";
import FileManagementSystem, {
} from "../../services/file-management-system";
import { UploadJob } from "../../services/job-status-service/types";
import { AnnotationType, ColumnType } from "../../services/labkey-client/types";
import { Template } from "../../services/metadata-management-service/types";
import {
  determineFilesFromNestedPaths,
  determineIsMultifile,
  extensionToFileTypeMap,
  FileType,
  splitTrimAndFilter
} from "../../util";
import { requestFailed } from "../actions";
import { setErrorAlert } from "../feedback/actions";
import { setPlateBarcodeToPlates } from "../metadata/actions";
import {
  getAnnotations,
  getAnnotationTypes,
  getBooleanAnnotationTypeId,
  getCurrentUploadFilePath,
  getDateAnnotationTypeId,
  getDateTimeAnnotationTypeId,
  getPlateBarcodeToPlates,
} from "../metadata/selectors";
import { closeUpload, viewUploads, resetUpload } from "../route/actions";
import { handleStartingNewUploadJob } from "../route/logics";
import { updateMassEditRow } from "../selection/actions";
import {
  getMassEditRow,
  getSelectedUploads,
  getSelectedUser,
} from "../selection/selectors";
import { getTemplateId } from "../setting/selectors";
import {
  ensureDraftGetsSaved,
  getApplyTemplateInfo,
} from "../stateHelpers";
import { setAppliedTemplate } from "../template/actions";
import { getAppliedTemplate } from "../template/selectors";
import {
  AsyncRequest,
  FileModel,
  PlateAtImagingSession,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependencies,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependenciesWithAction,
} from "../types";
import { batchActions } from "../util";

import {
  addUploadFiles,
  applyTemplate,
  cancelUploadFailed,
  cancelUploadSucceeded,
  editFileMetadataFailed,
  editFileMetadataSucceeded,
  initiateUploadFailed,
  initiateUploadSucceeded,
  replaceUpload,
  saveUploadDraftSuccess,
  uploadFailed,
} from "./actions";
import {
  ADD_UPLOAD_FILES,
  APPLY_TEMPLATE,
  CANCEL_UPLOADS,
  INITIATE_UPLOAD,
  OPEN_UPLOAD_DRAFT,
  RETRY_UPLOADS,
  SAVE_UPLOAD_DRAFT,
  SUBMIT_FILE_METADATA_UPDATE,
  UPDATE_UPLOAD,
  UPDATE_UPLOAD_ROWS,
  UPLOAD_WITHOUT_METADATA,
} from "./constants";
import {
  getCanSaveUploadDraft,
  getUpload,
  getUploadFileNames,
  getUploadRequests,
} from "./selectors";
import {
  ApplyTemplateAction,
  CancelUploadAction,
  InitiateUploadAction,
  OpenUploadDraftAction,
  RetryUploadAction,
  SaveUploadDraftAction,
  SubmitFileMetadataUpdateAction,
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
    }: ReduxLogicProcessDependenciesWithAction<InitiateUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const groupId = FileManagementSystem.createUploadGroupId();

    const user = getSelectedUser(getState());
    const requests = getUploadRequests(getState());

    let uploads: UploadJob[];
    try {
      uploads = await Promise.all(
        requests.map((request) =>
          fms.initiateUpload(request, user, { groupId })
        )
      );
    } catch (error) {
      dispatch(
        initiateUploadFailed(
          action.payload,
          `Something went wrong while initiating the upload. Details: ${error?.message}`
        )
      );
      done();
      return;
    }

    dispatch(batchActions([
      initiateUploadSucceeded(action.payload),
      resetUpload()
    ]))

    const uploadTasks = uploads.map((upload) => async () => {
      try {
        await fms.upload(upload);
      } catch (error) {
        dispatch(
          uploadFailed(
            `Something went wrong while uploading your files. Details: ${error?.message}`,
            upload.jobName
          )
        );
      }
    });

    // Upload 25 (semi-arbitrary number) files at a time to prevent performance issues
    // in the case of uploads with many files.
    const uploadQueue = new BatchedTaskQueue(uploadTasks, 25);
    await uploadQueue.run();

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
    }: ReduxLogicProcessDependenciesWithAction<CancelUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const jobs = action.payload;
    await Promise.all(
      jobs.map(async (job) => {
        try {
          await fms.cancel(job.jobId);
          dispatch(cancelUploadSucceeded(job.jobName || ""));
        } catch (e) {
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
    }: ReduxLogicProcessDependenciesWithAction<RetryUploadAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const uploads = action.payload;
    await Promise.all(
      uploads.map(async (upload) => {
        try {
          await fms.retry(upload.jobId);
        } catch (e) {
          const error = `Retry upload ${upload.jobName} failed: ${e.message}`;
          dispatch(uploadFailed(error, upload.jobName || ""));
        }
      })
    );
    done();
  },
  type: RETRY_UPLOADS,
  warnTimeout: 0,
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
    const upload = deps.action.payload.upload || deps.action.payload;

    // If a plate barcode is being updated check for imaging sessions
    const plateBarcode = upload[AnnotationName.PLATE_BARCODE]?.[0];
    if (plateBarcode) {
      const plateBarcodeToPlates = getPlateBarcodeToPlates(deps.getState());
      // Avoid re-querying for the imaging sessions if this
      // plate barcode has been selected before
      if (!Object.keys(plateBarcodeToPlates).includes(plateBarcode)) {
        const imagingSessionsForPlateBarcode =
          await deps.labkeyClient.findImagingSessionsByPlateBarcode(
            plateBarcode
          );
        const imagingSessionsWithPlateInfo: PlateAtImagingSession[] =
          await Promise.all(
            imagingSessionsForPlateBarcode.map(async (is) => {
              const { wells } = await deps.mmsClient.getPlate(
                plateBarcode,
                is["ImagingSessionId"]
              );

              return {
                wells,
                imagingSessionId: is["ImagingSessionId"],
                name: is["ImagingSessionId/Name"],
              };
            })
          );

        // If the barcode has no imaging sessions, find info of plate without
        if (!imagingSessionsWithPlateInfo.length) {
          const { wells } = await deps.mmsClient.getPlate(plateBarcode);
          imagingSessionsWithPlateInfo.push({ wells });
        }

        dispatch(
          setPlateBarcodeToPlates({
            ...plateBarcodeToPlates,
            [plateBarcode]: imagingSessionsWithPlateInfo,
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
        console.error(
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
      getState,
    }: ReduxLogicProcessDependenciesWithAction<OpenUploadDraftAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    dispatch(
      batchActions([
        replaceUpload(ctx.filePath, ctx.draft),
        ...handleStartingNewUploadJob(),
      ])
    );

    const { draft } = ctx;
    const annotations = getAnnotations(getState());
    const dateAnnotationTypeId = getDateAnnotationTypeId(getState());
    const dateTimeAnnotationTypeId = getDateTimeAnnotationTypeId(getState());
    const dateAnnotationNames = annotations
      .filter(
        (a) =>
          a.annotationTypeId === dateAnnotationTypeId ||
          a.annotationTypeId === dateTimeAnnotationTypeId
      )
      .map((a) => a.name);
    const dateAnnotationNameSet = new Set(dateAnnotationNames);
    // Dates are not converted back into JSON objects when read from a file so they
    // must be formatted
    const uploadFilesFromDraft = Object.entries(getUpload(draft)).reduce(
      (uploadAccum, [key, file]) => ({
        ...uploadAccum,
        [key]: Object.entries(file).reduce((fileAccum, [name, value]) => {
          if (dateAnnotationNameSet.has(name)) {
            return {
              ...fileAccum,
              [name]: castArray(value).map((v: string) => new Date(v)),
            };
          }

          return {
            ...fileAccum,
            [name]: value,
          };
        }, {}),
      }),
      {}
    );
    try {
      dispatch(setPlateBarcodeToPlates(getPlateBarcodeToPlates(draft)));
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
    const { action, ctx, getState } = deps;
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
      const filePath = await deps.ipcRenderer.invoke(
        RendererProcessEvents.SHOW_DIALOG,
        {
          filters: [{ name: "JSON", extensions: ["json"] }],
          properties: ["openFile"],
        }
      );
      if (filePath) {
        ctx.filePath = filePath;
      } else {
        // user cancelled
        reject({ type: "ignore" });
        return;
      }
    } catch (e) {
      reject(setErrorAlert(`Could not open file: ${e.message}`));
    }

    try {
      ctx.draft = JSON.parse(await fs.promises.readFile(ctx.filePath, "utf8"));
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
    const groupId = FileManagementSystem.createUploadGroupId();

    const user = getSelectedUser(deps.getState());

    let uploads: UploadJob[];
    try {
      const filePaths = await Promise.all(deps.action.payload.map(async (filePath) => {
        const isMultifile = determineIsMultifile(filePath);
        // todo determineFilesFromNestedPaths first arg may not need to be an array?
        return await determineFilesFromNestedPaths([filePath], isMultifile);
      }));
      uploads = await Promise.all(
          filePaths.flat().map((filePath) => {
            const isMultifile = determineIsMultifile(filePath); // todo: simplify this whole function so this isn't called twice
            return deps.fms.initiateUpload(
                {
                  file: {
                    disposition: "tape", // prevent czi -> ome.tiff conversions
                    fileType:
                        extensionToFileTypeMap[
                            path.extname(filePath).toLowerCase()
                            ] || FileType.OTHER,
                    originalPath: filePath,
                    shouldBeInArchive: true,
                    shouldBeInLocal: true,
                  },
                  microscopy: {},
                },
                user,
                {
                  groupId,
                  multifile: isMultifile
                }
            );
          })
      );
    } catch (error) {
      dispatch(
        uploadFailed(
          `Something went wrong while initiating the upload. Details: ${error?.message}`,
          deps.action.payload.join(", ")
        )
      );
      done();
      return;
    }

    const uploadTasks = uploads.map((upload) => async () => {
      const name = upload.jobName;
      try {
        await deps.fms.upload(upload);
      } catch (error) {
        dispatch(
          uploadFailed(
            `Something went wrong while uploading your files. Details: ${error?.message}`,
            name
          )
        );
      }
    });

    // Upload 25 (semi-arbitrary number) files at a time to prevent performance issues
    // in the case of uploads with many files.
    const uploadQueue = new BatchedTaskQueue(uploadTasks, 25);
    await uploadQueue.run();

    done();
  },
  type: UPLOAD_WITHOUT_METADATA,
  warnTimeout: 0,
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
  updateUploadLogic,
  updateUploadRowsLogic,
  uploadWithoutMetadataLogic,
];

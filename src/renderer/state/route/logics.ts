import { existsSync } from "fs";
import { platform } from "os";

import { Menu, MenuItem } from "electron";
import { castArray, difference, groupBy, isEmpty, uniq } from "lodash";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";

import {
  DAY_AS_MS,
  HOUR_AS_MS,
  MINUTE_AS_MS,
  AnnotationName,
} from "../../constants";
import { JSSJobStatus } from "../../services/job-status-client/types";
import LabkeyClient from "../../services/labkey-client";
import {
  ColumnType,
  LabKeyFileMetadata,
  LK_SCHEMA,
  Lookup,
  ScalarType,
} from "../../services/labkey-client/types";
import {
  MMSFileAnnotation,
  FSSResponseFile,
  UploadRequest,
} from "../../services/types";
import { Duration } from "../../types";
import { makePosixPathCompatibleWithPlatform } from "../../util";
import { requestFailed } from "../actions";
import {
  openSetMountPointNotification,
  setErrorAlert,
} from "../feedback/actions";
import { setPlateBarcodeToPlates } from "../metadata/actions";
import {
  getAllAnnotations,
  getAnnotationLookups,
  getBooleanAnnotationTypeId,
  getCurrentUploadFilePath,
  getImagingSessions,
  getLookups,
  getUploadHistory,
} from "../metadata/selectors";
import { getMountPoint } from "../setting/selectors";
import { ensureDraftGetsSaved, getApplyTemplateInfo } from "../stateHelpers";
import { setAppliedTemplate } from "../template/actions";
import {
  AsyncRequest,
  Logger,
  Page,
  PlateAtImagingSession,
  PlateBarcodeToPlates,
  ReduxLogicDoneCb,
  ReduxLogicNextCb,
  ReduxLogicProcessDependenciesWithAction,
  ReduxLogicRejectCb,
  ReduxLogicTransformDependencies,
  ReduxLogicTransformDependenciesWithAction,
  State,
  UploadStateBranch,
} from "../types";
import {
  clearUploadDraft,
  clearUploadHistory,
  jumpToPastUpload,
} from "../upload/actions";
import { getCanSaveUploadDraft } from "../upload/selectors";
import { batchActions } from "../util";

import { resetUpload, selectPage, viewUploadsSucceeded } from "./actions";
import { CLOSE_UPLOAD, START_NEW_UPLOAD, VIEW_UPLOADS } from "./constants";
import { Upload, ViewUploadsAction } from "./types";

// have to cast here because Electron's typings for MenuItem is incomplete
const getFileMenu = (menu: Menu): MenuItem | undefined =>
  menu.items.find(
    (menuItem: MenuItem) => menuItem.label.toLowerCase() === "file"
  );

export const setSwitchEnvEnabled = (
  menu: Menu,
  enabled: boolean,
  logger: Logger
): void => {
  const fileMenu = getFileMenu(menu);
  if (!fileMenu || !fileMenu.submenu) {
    logger.error("Could not update application menu");
    return;
  }

  const switchEnvironmentMenuItem = fileMenu.submenu.items.find(
    (menuItem: MenuItem) =>
      menuItem.label.toLowerCase() === "switch environment"
  );
  if (switchEnvironmentMenuItem) {
    switchEnvironmentMenuItem.enabled = enabled;
  } else {
    logger.error("Could not update application menu");
  }
};

const stateBranchHistory = [
  {
    clearHistory: clearUploadHistory,
    getHistory: getUploadHistory,
    jumpToPast: jumpToPastUpload,
  },
];
export const resetHistoryActions = stateBranchHistory.flatMap((history) => [
  history.jumpToPast(0),
  history.clearHistory(),
]);

// Returns common actions needed because we share the upload tab between upload drafts for now
// Some of these actions cannot be done in the reducer because they are handled by a higher-order reducer
// from redux-undo.
export const handleStartingNewUploadJob = (
  logger: Logger,
  state: State,
  getApplicationMenu: () => Menu | null
): AnyAction[] => {
  const actions: AnyAction[] = [
    selectPage(Page.UploadWithTemplate),
    clearUploadDraft(),
    clearUploadHistory(),
  ];
  const isMountedAsExpected = existsSync(
    makePosixPathCompatibleWithPlatform("/allen/aics", platform())
  );
  const menu = getApplicationMenu();
  if (menu) {
    setSwitchEnvEnabled(menu, false, logger);
  }
  const mountPoint = getMountPoint(state);
  if (!isMountedAsExpected && !mountPoint) {
    actions.push(openSetMountPointNotification());
  }

  return actions;
};

const resetUploadLogic = createLogic({
  type: [CLOSE_UPLOAD, START_NEW_UPLOAD],
  validate: async (
    deps: ReduxLogicTransformDependencies,
    next: ReduxLogicNextCb,
    reject: ReduxLogicRejectCb
  ) => {
    const { action, getState } = deps;

    try {
      const { cancelled } = await ensureDraftGetsSaved(
        deps,
        getCanSaveUploadDraft(getState()),
        getCurrentUploadFilePath(getState())
      );

      if (cancelled) {
        // prevent action from getting to reducer
        reject({ type: "ignore" });
        return;
      }
    } catch (e) {
      reject(setErrorAlert(e.message));
      return;
    }

    next({
      // we want to write to local storage but also keep this as a batched action
      ...clearUploadDraft(),
      ...batchActions([
        ...resetHistoryActions,
        resetUpload(),
        // If the action isn't after the resetHistoryActions then the side-effects
        // of this action may be reset - Sean M 02/08/21
        action,
      ]),
    });
  },
});

/*
  Convert from upload requests formatted for FSS transmission into the shape
  of the upload branch at the time of the initial upload the requests
  were created from.
*/
function convertUploadRequestsToUploadStateBranch(
  files: UploadRequest[],
  state: State
): Upload {
  const annotations = getAllAnnotations(state);
  const lookups = getLookups(state);
  const annotationLookups = getAnnotationLookups(state);
  const annotationIdToAnnotationMap = groupBy(annotations, "annotationId");
  const annotationIdToLookupMap = annotationLookups.reduce(
    (mapSoFar, curr) => ({
      [curr.annotationId]: lookups.find((l) => l.lookupId === curr.lookupId),
      ...mapSoFar,
    }),
    {} as { [annotationId: number]: Lookup | undefined }
  );

  let templateId: number | undefined = undefined;
  const uploadMetadata = files.reduce((uploadSoFar, file) => {
    templateId = file.customMetadata?.templateId || templateId;

    if (!file.customMetadata?.annotations.length) {
      return {
        ...uploadSoFar,
        [file.file.originalPath]: {
          file: file.file.originalPath,
          fileId: file.fileId,
        },
      };
    }

    return file.customMetadata.annotations.reduce(
      (
        keyToMetadataSoFar: UploadStateBranch,
        annotation: MMSFileAnnotation
      ) => {
        const annotationDefinition =
          annotationIdToAnnotationMap[annotation.annotationId]?.[0];
        if (!annotationDefinition) {
          throw new Error(
            `Unable to find matching Annotation for Annotation ID: ${annotation.annotationId}`
          );
        }

        let values: any[] = annotation.values;
        switch (annotationDefinition["annotationTypeId/Name"]) {
          case ColumnType.BOOLEAN:
            values = values.map((v) => `${v}`.toLowerCase() === "true");
            break;
          case ColumnType.DATE:
          case ColumnType.DATETIME:
            values = values.map((v) => new Date(`${v}`));
            break;
          case ColumnType.LOOKUP:
            if (
              annotationIdToLookupMap[annotation.annotationId]?.[
                "scalarTypeId/Name"
              ] === ScalarType.INT
            ) {
              values = values.map((v) => parseInt(v, 10));
            }
            break;
          case ColumnType.NUMBER:
            values = values.map((v) => {
              try {
                return parseFloat(v);
              } catch (e) {
                return v;
              }
            });
            break;
          case ColumnType.DURATION:
            values = values.map(
              (v: string): Duration => {
                let remainingMs = parseInt(v);

                function calculateUnit(unitAsMs: number, useFloor = true) {
                  const numUnit = useFloor
                    ? Math.floor(remainingMs / unitAsMs)
                    : remainingMs / unitAsMs;
                  if (numUnit > 0) {
                    remainingMs -= numUnit * unitAsMs;
                  }
                  return numUnit;
                }

                const days = calculateUnit(DAY_AS_MS);
                const hours = calculateUnit(HOUR_AS_MS);
                const minutes = calculateUnit(MINUTE_AS_MS);
                const seconds = calculateUnit(1000, false);

                return { days, hours, minutes, seconds };
              }
            );
        }

        const filePath = file.file.originalPath;
        return {
          ...keyToMetadataSoFar,
          [filePath]: {
            ...(keyToMetadataSoFar[filePath] || {}),
            file: filePath,
            fileId: file.fileId,
            [annotationDefinition.name]: uniq([
              ...(keyToMetadataSoFar[filePath]?.[annotationDefinition.name] ||
                []),
              ...values,
            ]),
          },
        };
      },
      uploadSoFar
    );
  }, {} as UploadStateBranch);

  return { templateId, uploadMetadata };
}

const RELEVANT_FILE_COLUMNS = [
  "FileName",
  "FileSize",
  "FileType",
  "ThumbnailId",
  "ThumbnailLocalFilePath",
  "ArchiveFilePath",
  "LocalFilePath",
  "PublicFilePath",
  "Modified",
  "ModifiedBy",
];

const viewUploadsLogic = createLogic({
  process: async (
    {
      ctx,
      getApplicationMenu,
      getState,
      labkeyClient,
      logger,
      mmsClient,
    }: ReduxLogicProcessDependenciesWithAction<ViewUploadsAction>,
    dispatch: ReduxLogicNextCb,
    done: ReduxLogicDoneCb
  ) => {
    const state = getState();
    try {
      // Open the upload tab and make sure application menu gets updated and redux-undo histories reset.
      dispatch(
        batchActions(
          handleStartingNewUploadJob(logger, state, getApplicationMenu)
        )
      );

      // Second, we fetch the file metadata
      const { requests, fileIds } = ctx as {
        requests: UploadRequest[];
        fileIds: string[];
      };
      const fileIdsAsFiles: UploadRequest[] = await Promise.all(
        fileIds.map(async (fileId: string) => {
          const [labkeyFileMetadata, customMetadata] = await Promise.all([
            labkeyClient.selectFirst<LabKeyFileMetadata>(
              LK_SCHEMA.FMS,
              "File",
              RELEVANT_FILE_COLUMNS,
              [LabkeyClient.createFilter("FileId", fileId)]
            ),
            mmsClient.getFileMetadata(fileId),
          ]);
          return {
            ...labkeyFileMetadata,
            fileId,
            customMetadata,
            file: {
              originalPath: labkeyFileMetadata.localFilePath as string,
              fileType: labkeyFileMetadata.fileType,
            },
          };
        })
      );
      const uploadsToView = convertUploadRequestsToUploadStateBranch(
        [...requests, ...fileIdsAsFiles],
        state
      );

      // Any barcoded plate can be snapshot in time as that plate at a certain
      // imaging session. The contents & images of the plates at that time (imaging session)
      // may vary so the app needs to provide options for the user to choose between
      const imagingSessions = getImagingSessions(state);
      const { uploadMetadata } = uploadsToView;
      const plateBarcodeToPlates: PlateBarcodeToPlates = {};
      for (const [key, upload] of Object.entries(uploadMetadata)) {
        // An upload is assumed to only have one plate associated with it
        const representativeWellId = upload[AnnotationName.WELL]?.[0];
        if (representativeWellId) {
          const plate = await labkeyClient.findPlateByWellId(
            representativeWellId
          );

          // Derive and apply the plate barcode and imaging session found via the well
          const imagingSession = imagingSessions.find(
            (is) => is.imagingSessionId === plate.ImagingSessionId
          );
          uploadMetadata[key][AnnotationName.PLATE_BARCODE] = [plate.BarCode];
          uploadMetadata[key][AnnotationName.IMAGING_SESSION] = imagingSession
            ? [imagingSession.name]
            : [];

          // Avoid re-querying for the imaging sessions if this
          // plate barcode has been selected before
          if (!Object.keys(plateBarcodeToPlates).includes(plate.BarCode)) {
            const imagingSessionsForPlateBarcode = await labkeyClient.findImagingSessionsByPlateBarcode(
              plate.BarCode
            );
            const imagingSessionsWithPlateInfo: PlateAtImagingSession[] = await Promise.all(
              imagingSessionsForPlateBarcode.map(async (is) => {
                const { wells } = await mmsClient.getPlate(
                  plate.BarCode,
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
              const { wells } = await mmsClient.getPlate(plate.BarCode);
              imagingSessionsWithPlateInfo.push({ wells });
            }

            plateBarcodeToPlates[plate.BarCode] = imagingSessionsWithPlateInfo;
          }
        }
      }

      const actions: AnyAction[] = [
        setPlateBarcodeToPlates(plateBarcodeToPlates),
      ];

      if (uploadsToView.templateId) {
        const booleanAnnotationTypeId = getBooleanAnnotationTypeId(getState());
        if (!booleanAnnotationTypeId) {
          throw new Error(
            "Boolean annotation type id not found. Contact Software."
          );
        }
        const { template, uploads } = await getApplyTemplateInfo(
          uploadsToView.templateId,
          mmsClient,
          dispatch,
          booleanAnnotationTypeId,
          uploadMetadata
        );
        actions.push(
          setAppliedTemplate(template, uploads),
          viewUploadsSucceeded(uploads)
        );
      } else {
        actions.push(viewUploadsSucceeded(uploadMetadata));
      }

      dispatch(batchActions(actions));
    } catch (e) {
      dispatch(
        requestFailed(
          "Could not open upload editor: " + e.message,
          AsyncRequest.GET_FILE_METADATA_FOR_JOB
        )
      );
    }
    done();
  },
  type: VIEW_UPLOADS,
  validate: async (
    deps: ReduxLogicTransformDependenciesWithAction<ViewUploadsAction>,
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

    // Validate the uploads passed in as the action payload
    ctx.fileIds = [];
    ctx.requests = [];
    try {
      action.payload.forEach((upload) => {
        if (
          upload.status === JSSJobStatus.SUCCEEDED &&
          upload.serviceFields?.result &&
          Array.isArray(upload?.serviceFields?.result)
        ) {
          const originalFileIds = upload.serviceFields.result.map(
            ({ fileId }: FSSResponseFile) => fileId
          );
          const deletedFileIds = upload.serviceFields.deletedFileIds
            ? castArray(upload.serviceFields.deletedFileIds)
            : [];
          const fileIds = difference(originalFileIds, deletedFileIds);
          ctx.fileIds = [...ctx.fileIds, ...fileIds];
        } else if (
          upload.serviceFields?.files &&
          !isEmpty(upload.serviceFields?.files)
        ) {
          ctx.requests = [...ctx.requests, ...upload.serviceFields?.files];
        } else {
          throw new Error(`Upload ${upload.jobName} has missing information`);
        }
      });

      next(action);
    } catch (error) {
      reject(setErrorAlert(error.message || "Failed to open uploads"));
    }
  },
});

export default [viewUploadsLogic, resetUploadLogic];

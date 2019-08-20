import { map } from "lodash";
import Logger from "js-logger";
import { userInfo } from "os";
import { createLogic } from "redux-logic";

import LabkeyClient from "../../util/labkey-client";
import { addEvent, setAlert } from "../feedback/actions";
import { AlertType } from "../feedback/types";
import { addPendingJob, removePendingJobs } from "../job/actions";
import { getDatabaseMetadata } from "../metadata/selectors";
import { DatabaseMetadata, Table } from "../metadata/types";
import { deselectFiles } from "../selection/actions";
import { getSelectedBarcode } from "../selection/selectors";
import { ColumnDefinition, ColumnType } from "../setting/types";
import {
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicTransformDependencies,
} from "../types";
import { batchActions } from "../util";
import { ASSOCIATE_FILES_AND_WELLS, INITIATE_UPLOAD, UPDATE_SCHEMA } from "./constants";
import { getUpload, getUploadJobName, getUploadPayload } from "./selectors";
import { UploadMetadata, UploadStateBranch } from "./types";

const associateFileAndWellLogic = createLogic({
    transform: ({action, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const state = getState();
        action.payload = {
            ...action.payload,
            barcode: getSelectedBarcode(state),
        };
        next(batchActions([
            action,
            deselectFiles(),
        ]));
    },
    type: ASSOCIATE_FILES_AND_WELLS,
});

// This logic is to add new user-defined columns to each upload row, and remove any old columns
const updateSchemaLogic = createLogic({
    transform: async ({action, getState, httpClient}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        const { schema, schemaFile } = action.payload;
        const state = getState();
        const uploads: UploadStateBranch = getUpload(state);
        const tables: DatabaseMetadata | undefined = getDatabaseMetadata(state);

        await Promise.all(map(uploads, (async (upload: UploadMetadata, filepath: string): Promise<void> => {
            // By only grabbing the initial fields of the upload we can remove old schema columns
            const uploadData: UploadMetadata = {
                barcode: upload.barcode,
                notes: upload.notes,
                schemaFile,
                wellIds: upload.wellIds,
                wellLabels: upload.wellLabels,
            };
            if (schema) {
                // We want to have all values consistently be either null or false so we can detect them in the upload
                // especially for cases where null is a distinct value that we would have otherwise ignored
                // However, boolean fields need to be false by default because otherwise we would have null === false
                // which isn't necessarily true (except to javascript)
                await Promise.all(schema.columns.map(async (column: ColumnDefinition): Promise<void> => {
                    uploadData[column.label] = column.type.type === ColumnType.BOOLEAN ? false : null;
                    if (column.type.type === ColumnType.LOOKUP && tables) {
                        const { name, schemaName }: Table = tables[column.type.table];
                        column.type.dropdownValues = await LabkeyClient.Get.ColumnValues(httpClient,
                                                                                         schemaName,
                                                                                         name,
                                                                                         column.type.column);
                    }
                }));
            }
            action.payload.uploads[filepath] = uploadData;
        })));
        next(action);
    },
    type: UPDATE_SCHEMA,
});

const initiateUploadLogic = createLogic({
    process: async ({ctx, fms, getState, ipcRenderer}: ReduxLogicProcessDependencies,
                    dispatch: ReduxLogicNextCb, done: ReduxLogicDoneCb) => {
        const now = new Date();
        dispatch(addPendingJob({
            created: now,
            currentStage: "Pending",
            jobId: (now).toLocaleString(),
            jobName: ctx.name,
            modified: now,
            status: "WAITING",
            uploads: ctx.uploads,
            user: userInfo().username,
        }));

        try {
            const result = await fms.uploadFiles(getUploadPayload(getState()), ctx.name);
            Logger.debug(`UPLOAD_FINISHED for jobName=${ctx.name} with result:`, result);
            dispatch(addEvent("Upload Finished", AlertType.SUCCESS, new Date()));

        } catch (e) {
            Logger.error(`UPLOAD_FAILED for jobName=${ctx.name}`, e.message);
            dispatch(setAlert({
                message: `Upload Failed: ${e.message}`,
                type: AlertType.ERROR,
            }));
        }

        dispatch(removePendingJobs(ctx.name));
        done();
    },
    transform: async ({action, ctx, fms, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb) => {
        try {
            await fms.validateMetadata(getUploadPayload(getState()));
            ctx.name = getUploadJobName(getState());
            ctx.uploads = getUploadPayload(getState());
            next(batchActions([
                setAlert({
                    message: "Starting upload",
                    type: AlertType.INFO,
                }),
                action,
            ]));
        } catch (e) {
            next(setAlert({
                message: e.message || "Validation error",
                type: AlertType.ERROR,
            }));
        }
    },
    type: INITIATE_UPLOAD,
});

export default [
    associateFileAndWellLogic,
    initiateUploadLogic,
    updateSchemaLogic,
];

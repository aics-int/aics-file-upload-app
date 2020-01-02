import { difference } from "lodash";
import { createSelector } from "reselect";
import { UNIMPORTANT_COLUMNS } from "../metadata/constants";

import { State } from "../types";

export const getAssociateByWorkflow = (state: State) => state.setting.associateByWorkflow;
export const getIncompleteJobs = (state: State) => state.setting.incompleteJobs;
export const getLimsHost = (state: State) => state.setting.limsHost;
export const getLimsPort = (state: State) => state.setting.limsPort;
export const getLimsProtocol = (state: State) => state.setting.limsProtocol;
export const getMountPoint = (state: State) => state.setting.mountPoint;
export const getTemplateId = (state: State) => state.setting.templateId;
export const getMetadataColumns = (state: State) => state.setting.metadataColumns;

export const getAreAllMetadataColumnsSelected = createSelector(
    [ getMetadataColumns ],
    (metadataColumns: string[]) => (
        !difference(UNIMPORTANT_COLUMNS, metadataColumns).length
));

export const getLimsUrl = createSelector([
    getLimsProtocol,
    getLimsHost,
    getLimsPort,
], (protocol: string, host: string, port: string) => {
    return `${protocol}://${host}:${port}`;
});

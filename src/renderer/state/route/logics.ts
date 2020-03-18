import { Menu, MenuItem } from "electron";
import { existsSync } from "fs";
import { isEmpty, isNil } from "lodash";
import { platform } from "os";
import { AnyAction } from "redux";
import { createLogic } from "redux-logic";
import { makePosixPathCompatibleWithPlatform } from "../../util";
import { openSetMountPointNotification } from "../feedback/actions";

import { updatePageHistory } from "../metadata/actions";
import { getSelectionHistory, getTemplateHistory, getUploadHistory } from "../metadata/selectors";
import { clearSelectionHistory, jumpToPastSelection, toggleFolderTree } from "../selection/actions";
import { getCurrentSelectionIndex } from "../selection/selectors";
import { getMountPoint } from "../setting/selectors";
import { clearTemplateHistory, jumpToPastTemplate } from "../template/actions";
import { getCurrentTemplateIndex } from "../template/selectors";
import {
    Logger,
    ReduxLogicDoneCb,
    ReduxLogicNextCb,
    ReduxLogicProcessDependencies,
    ReduxLogicRejectCb,
    ReduxLogicTransformDependencies,
} from "../types";
import { clearUploadHistory, jumpToPastUpload, updateUpload } from "../upload/actions";
import { getUploadRowKey } from "../upload/constants";
import { getCurrentUploadIndex, getUploadFiles } from "../upload/selectors";
import { batchActions } from "../util";

import { selectPage } from "./actions";
import { CLOSE_UPLOAD_TAB, getNextPage, GO_BACK, GO_FORWARD, pageOrder, SELECT_PAGE } from "./constants";
import { getPage } from "./selectors";
import { Page } from "./types";

interface MenuItemWithSubMenu extends MenuItem {
    submenu?: Menu;
}

// have to cast here because Electron's typings for MenuItem is incomplete
const getFileMenu = (menu: Menu): MenuItemWithSubMenu | undefined => menu.items
    .find((menuItem: MenuItem) => menuItem.label.toLowerCase() === "file") as MenuItemWithSubMenu | undefined;

export const setSwitchEnvEnabled = (menu: Menu, enabled: boolean, logger: Logger): void => {
    const fileMenu = getFileMenu(menu);
    if (!fileMenu || !fileMenu.submenu) {
        logger.error("Could not update application menu");
        return;
    }

    const switchEnvironmentMenuItem = fileMenu.submenu.items
        .find((menuItem: MenuItem) => menuItem.label.toLowerCase() === "switch environment");
    if (switchEnvironmentMenuItem) {
        switchEnvironmentMenuItem.enabled = enabled;
    } else {
        logger.error("Could not update application menu");
    }
};

export const setSaveUploadDraftEnabled = (menu: Menu, enabled: boolean, logger: Logger): void => {
    const fileMenu = getFileMenu(menu);
    if (!fileMenu || !fileMenu.submenu) {
        logger.error("Could not update application menu");
        return;
    }

    const saveUploadDraftMenuItem = fileMenu.submenu.items
        .find((menuItem: MenuItem) => menuItem.label.toLowerCase() === "save upload draft");
    if (saveUploadDraftMenuItem) {
        saveUploadDraftMenuItem.enabled = enabled;
    } else {
        logger.error("Could not update application menu");
    }
};

const pagesToAllowSwitchingEnvironments = [Page.UploadSummary, Page.DragAndDrop];
const updateAppMenu = (nextPage: Page, menu: Menu | null, logger: Logger) => {
    if (menu) {
        setSwitchEnvEnabled(menu, pagesToAllowSwitchingEnvironments.includes(nextPage), logger);
        setSaveUploadDraftEnabled(menu, nextPage !== Page.UploadSummary, logger);
    } else {
        logger.error("Could not update application menu");
    }
};

const stateBranchHistory = [
    {
        clearHistory: clearSelectionHistory,
        getHistory: getSelectionHistory,
        jumpToPast: jumpToPastSelection,
    },
    {
        clearHistory: clearTemplateHistory,
        getHistory: getTemplateHistory,
        jumpToPast: jumpToPastTemplate,
    },
    {
        clearHistory: clearUploadHistory,
        getHistory: getUploadHistory,
        jumpToPast: jumpToPastUpload,
    },
];

const selectPageLogic = createLogic({
    process: (
        { action, getApplicationMenu, getState, logger }: ReduxLogicProcessDependencies,
        dispatch: ReduxLogicNextCb,
        done: ReduxLogicDoneCb
    ) => {
        const {currentPage, nextPage} = action.payload;

        if (nextPage === Page.DragAndDrop) {
            const isMountedAsExpected = existsSync(makePosixPathCompatibleWithPlatform("/allen/aics", platform()));
            const mountPoint = getMountPoint(getState());
            if (!isMountedAsExpected && !mountPoint) {
                dispatch(openSetMountPointNotification());
            }
        }

        const state = getState();

        const actions: AnyAction[] = [];
        // Folder tree is a necessary part of associating files, so open if not already
        if (!state.selection.present.folderTreeOpen && nextPage === Page.AssociateFiles) {
            actions.push(toggleFolderTree());
        }

        const nextPageOrder: number = pageOrder.indexOf(nextPage);
        const currentPageOrder: number = pageOrder.indexOf(currentPage);

        updateAppMenu(nextPage, getApplicationMenu(), logger);

        // going back - rewind selections, uploads & template to the state they were at when user was on previous page
        if (nextPageOrder < currentPageOrder) {
            actions.push(action);

            stateBranchHistory.forEach((history) => {
                const historyForThisStateBranch = history.getHistory(state);

                if (nextPageOrder === 0 && currentPageOrder === pageOrder.length - 1) {
                    actions.push(
                        history.jumpToPast(0),
                        history.clearHistory()
                    );
                } else if (historyForThisStateBranch && !isNil(historyForThisStateBranch[nextPage])) {
                    const index = historyForThisStateBranch[nextPage];
                    actions.push(history.jumpToPast(index));
                }
            });

        } else if (nextPage === Page.UploadSummary) {
            stateBranchHistory.forEach(
                (history) => actions.push(history.jumpToPast(0), history.clearHistory())
            );

        // going forward - store current selection/upload indexes so we can rewind to this state if user goes back
        } else if (nextPageOrder > currentPageOrder) {
            const selectionIndex = getCurrentSelectionIndex(state);
            const uploadIndex = getCurrentUploadIndex(state);
            const templateIndex = getCurrentTemplateIndex(state);
            actions.push(updatePageHistory(currentPage, selectionIndex, uploadIndex, templateIndex));
            if (nextPage === Page.SelectStorageLocation) {
                const files = getUploadFiles(state);
                const uploadPartial = {
                    shouldBeInArchive: true,
                    shouldBeInLocal: true,
                };
                actions.push(
                    ...files.map((file: string) => updateUpload(getUploadRowKey({file}), uploadPartial))
                );
            }
        }

        if (!isEmpty(actions)) {
            dispatch(batchActions(actions));
        }

        done();
    },
    type: SELECT_PAGE,
});

const goBackLogic = createLogic({
    type: GO_BACK,
    validate: ({ dialog, getState, action }: ReduxLogicTransformDependencies,
               next: ReduxLogicNextCb, reject: ReduxLogicRejectCb) => {
        const state = getState();
        const currentPage = getPage(state);
        const nextPage = getNextPage(currentPage, -1);

        if (nextPage) {
            dialog.showMessageBox({
                buttons: ["Cancel", "Yes"],
                cancelId: 0,
                defaultId: 1,
                message: "Changes will be lost if you go back. Are you sure?",
                title: "Warning",
                type: "warning",
            }, (buttonIndex: number) => { // index of button clicked
                if (buttonIndex === 1) {
                    next(selectPage(currentPage, nextPage));
                } else {
                    reject(action);
                }
            });
        } else {
            reject(action);
        }
    },
});

const goForwardLogic = createLogic({
    type: GO_FORWARD,
    validate: ({action, getState}: ReduxLogicTransformDependencies,
               next: ReduxLogicNextCb, reject: ReduxLogicRejectCb) => {
        const currentPage = getPage(getState());
        const nextPage = getNextPage(currentPage, 1);

        if (nextPage) {
            next(selectPage(currentPage, nextPage));
        } else {
           reject(action);
        }
    },
});

const closeUploadTabLogic = createLogic({
    type: CLOSE_UPLOAD_TAB,
    validate: ({ action, dialog, getState}: ReduxLogicTransformDependencies, next: ReduxLogicNextCb,
               reject: ReduxLogicRejectCb) => {
        dialog.showMessageBox({
            buttons: ["Cancel", "Yes"],
            cancelId: 0,
            defaultId: 1,
            message: "Changes will be lost if you close this tab. Are you sure?",
            title: "Warning",
            type: "warning",
        }, (buttonIndex: number) => {
            if (buttonIndex === 1) {
                const currentPage = getPage(getState());
                next(selectPage(currentPage, Page.UploadSummary));
            } else {
                reject(action);
            }
        });
    },
});

export default [
    closeUploadTabLogic,
    goBackLogic,
    goForwardLogic,
    selectPageLogic,
];

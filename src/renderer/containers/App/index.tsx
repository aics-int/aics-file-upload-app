import "@aics/aics-react-labkey/dist/styles.css";
import { message, notification, Tabs } from "antd";
import { ipcRenderer, remote } from "electron";
import * as Logger from "js-logger";
import * as React from "react";
import { connect } from "react-redux";
import { ActionCreator } from "redux";

import { SAFELY_CLOSE_WINDOW, SWITCH_ENVIRONMENT } from "../../../shared/constants";

import FolderTree from "../../components/FolderTree";
import StatusBar from "../../components/StatusBar";
import { selection } from "../../state";
import { clearAlert, setAlert } from "../../state/feedback/actions";
import {
    getAlert,
    getIsLoading,
    getRecentEvent,
    getSetMountPointNotificationVisible,
} from "../../state/feedback/selectors";
import {
    AlertType,
    AppAlert,
    AppEvent,
    ClearAlertAction,
    SetAlertAction,
} from "../../state/feedback/types";
import { getIsSafeToExit } from "../../state/job/selectors";
import { requestMetadata } from "../../state/metadata/actions";
import { RequestMetadataAction } from "../../state/metadata/types";
import { closeUploadTab, selectView } from "../../state/route/actions";
import { setSaveUploadDraftEnabled, setSwitchEnvEnabled } from "../../state/route/logics";
import { getPage, getView } from "../../state/route/selectors";
import { AppPageConfig, CloseUploadTabAction, Page, SelectViewAction } from "../../state/route/types";
import {
    clearStagedFiles,
    loadFilesFromDragAndDrop,
    openFilesFromDialog,
    toggleFolderTree,
} from "../../state/selection/actions";
import {
    getFolderTreeOpen,
    getSelectedFiles,
    getStagedFiles,
} from "../../state/selection/selectors";
import {
    ClearStagedFilesAction,
    GetFilesInFolderAction,
    LoadFilesFromDragAndDropAction,
    LoadFilesFromOpenDialogAction,
    SelectFileAction,
    ToggleFolderTreeAction,
    UploadFile,
} from "../../state/selection/types";
import { gatherSettings, setMountPoint, switchEnvironment, updateSettings } from "../../state/setting/actions";
import { getLimsUrl } from "../../state/setting/selectors";
import {
    GatherSettingsAction,
    SetMountPointAction,
    SwitchEnvironmentAction,
    UpdateSettingsAction,
} from "../../state/setting/types";
import { State } from "../../state/types";
import {
    removeFileFromArchive, removeFileFromIsilon,
    undoFileWellAssociation,
    undoFileWorkflowAssociation,
} from "../../state/upload/actions";
import {
    FileTag,
    RemoveFileFromArchiveAction, RemoveFileFromIsilonAction,
    UndoFileWellAssociationAction,
    UndoFileWorkflowAssociationAction,
} from "../../state/upload/types";

import AddCustomData from "../AddCustomData";
import AssociateFiles from "../AssociateFiles";
import DragAndDropSquare from "../DragAndDropSquare";
import OpenTemplateModal from "../OpenTemplateModal";
import SaveUploadDraftModal from "../SaveUploadDraftModal";
import SelectStorageIntent from "../SelectStorageIntent";
import EnterBarcode from "../SelectUploadType";
import SettingsEditorModal from "../SettingsEditorModal";
import TemplateEditorModal from "../TemplateEditorModal";
import UploadSummary from "../UploadSummary";

import SearchFiles from "../SearchFiles";
import { getFileToTags } from "./selectors";

const styles = require("./styles.pcss");

const { TabPane } = Tabs;

const ALERT_DURATION = 2;

interface AppProps {
    alert?: AppAlert;
    clearAlert: ActionCreator<ClearAlertAction>;
    clearStagedFiles: ActionCreator<ClearStagedFilesAction>;
    closeUploadTab: ActionCreator<CloseUploadTabAction>;
    copyInProgress: boolean;
    fileToTags: Map<string, FileTag[]>;
    files: UploadFile[];
    folderTreeOpen: boolean;
    gatherSettings: ActionCreator<GatherSettingsAction>;
    getFilesInFolder: ActionCreator<GetFilesInFolderAction>;
    limsUrl: string;
    loadFilesFromDragAndDrop: ActionCreator<LoadFilesFromDragAndDropAction>;
    openFilesFromDialog: ActionCreator<LoadFilesFromOpenDialogAction>;
    loading: boolean;
    recentEvent?: AppEvent;
    removeFileFromArchive: ActionCreator<RemoveFileFromArchiveAction>;
    removeFileFromIsilon: ActionCreator<RemoveFileFromIsilonAction>;
    requestMetadata: ActionCreator<RequestMetadataAction>;
    selectFile: ActionCreator<SelectFileAction>;
    selectedFiles: string[];
    setAlert: ActionCreator<SetAlertAction>;
    selectView: ActionCreator<SelectViewAction>;
    setMountPoint: ActionCreator<SetMountPointAction>;
    setMountPointNotificationVisible: boolean;
    switchEnvironment: ActionCreator<SwitchEnvironmentAction>;
    page: Page;
    toggleFolderTree: ActionCreator<ToggleFolderTreeAction>;
    undoFileWellAssociation: ActionCreator<UndoFileWellAssociationAction>;
    undoFileWorkflowAssociation: ActionCreator<UndoFileWorkflowAssociationAction>;
    updateSettings: ActionCreator<UpdateSettingsAction>;
    view: Page;
}

const APP_PAGE_TO_CONFIG_MAP = new Map<Page, AppPageConfig>([
    [Page.DragAndDrop, {
        container: <DragAndDropSquare key="dragAndDrop" />,
    }],
    [Page.SelectUploadType, {
        container:  <EnterBarcode key="enterBarcode"/>,
    }],
    [Page.AssociateFiles, {
        container:  <AssociateFiles key="associateFiles"/>,
    }],
    [Page.SelectStorageLocation, {
        container:  <SelectStorageIntent key="selectStorageIntent"/>,
    }],
    [Page.AddCustomData, {
        container: <AddCustomData key="addCustomData"/>,
    }],
    [Page.UploadSummary, {
        container: <UploadSummary key="uploadSummary"/>,
    }],
]);

message.config({
    maxCount: 1,
});

class App extends React.Component<AppProps, {}> {
    public componentDidMount() {
        this.props.requestMetadata();
        this.props.gatherSettings();
        const menu = remote.Menu.getApplicationMenu();
        if (menu) {
            setSwitchEnvEnabled(menu, true, Logger);
            setSaveUploadDraftEnabled(menu, false, Logger);
        }
        ipcRenderer.on(SWITCH_ENVIRONMENT, this.props.switchEnvironment);
        ipcRenderer.on(SAFELY_CLOSE_WINDOW, () => {
            const warning = "Uploads are in progress. Exiting now may cause incomplete uploads to be abandoned and" +
                " will need to be manually cancelled. Are you sure?";
            if (this.props.copyInProgress) {
                remote.dialog.showMessageBox({
                    buttons: ["Cancel", "Close Anyways"],
                    message: warning,
                    title: "Danger!",
                    type: "warning",
                }, (response: number) => {
                    if (response === 1) {
                        remote.app.exit();
                    }
                });
            } else {
                remote.app.exit();
            }
        });
    }

    public componentDidUpdate(prevProps: AppProps) {
        const { alert, clearAlert: dispatchClearAlert, setMountPointNotificationVisible } = this.props;
        if (alert) {
            const { message: alertText, manualClear, type} = alert;
            const alertBody = <div>{alertText}</div>;
            const duration = manualClear ? 0 : ALERT_DURATION;

            switch (type) {
                case AlertType.WARN:
                    message.warn(alertBody, duration);
                    break;
                case AlertType.SUCCESS:
                    message.success(alertBody, duration);
                    break;
                case AlertType.ERROR:
                    message.error(alertBody, duration);
                    break;
                default:
                    message.info(alertBody, duration);
                    break;
            }

            dispatchClearAlert();
        }
        if (setMountPointNotificationVisible &&
            setMountPointNotificationVisible !== prevProps.setMountPointNotificationVisible) {
            notification.open({
                description:
                    "Click this notification to manually set the allen mount point",
                duration: 0,
                message: "Could not find allen mount point (/allen/aics).",
                onClick: () => {
                    notification.destroy();
                    this.props.setMountPoint();
                },
            });
        }
    }

    public render() {
        const {
            fileToTags,
            files,
            folderTreeOpen,
            getFilesInFolder,
            limsUrl,
            loading,
            recentEvent,
            selectFile,
            selectedFiles,
            page,
            view,
        } = this.props;
        const pageConfig = APP_PAGE_TO_CONFIG_MAP.get(page);
        const uploadSummaryConfig = APP_PAGE_TO_CONFIG_MAP.get(Page.UploadSummary);

        if (!pageConfig || !uploadSummaryConfig) {
            return null;
        }

        return (
            <div className={styles.container}>
                <div className={styles.mainContentContainer}>
                    <FolderTree
                       className={styles.folderTree}
                       clearStagedFiles={this.props.clearStagedFiles}
                       files={files}
                       folderTreeOpen={folderTreeOpen}
                       getFilesInFolder={getFilesInFolder}
                       isLoading={loading}
                       loadFilesFromDragAndDropAction={this.props.loadFilesFromDragAndDrop}
                       loadFilesFromOpenDialogAction={this.props.openFilesFromDialog}
                       onCheck={selectFile}
                       removeFileFromArchive={this.props.removeFileFromArchive}
                       removeFileFromIsilon={this.props.removeFileFromIsilon}
                       selectedKeys={selectedFiles}
                       setAlert={setAlert}
                       fileToTags={fileToTags}
                       toggleFolderTree={this.props.toggleFolderTree}
                       undoFileWellAssociation={this.props.undoFileWellAssociation}
                       undoFileWorkflowAssociation={this.props.undoFileWorkflowAssociation}
                    />
                    <div className={styles.mainContent}>
                        <Tabs
                            activeKey={view}
                            className={styles.tabContainer}
                            hideAdd={true}
                            onChange={this.props.selectView}
                            onEdit={this.onTabChange}
                            type="editable-card"
                        >
                            <TabPane
                                className={styles.tabContent}
                                tab="Summary"
                                key={Page.UploadSummary}
                                closable={false}
                            >
                                {uploadSummaryConfig.container}
                            </TabPane>
                            <TabPane
                                className={styles.tabContent}
                                tab="Search Files"
                                key={Page.SearchFiles}
                                closable={false}
                            >
                                <SearchFiles key="searchFiles"/>
                            </TabPane>
                            {page !== Page.UploadSummary && (
                                <TabPane className={styles.tabContent} tab="Current Upload" key={page} closable={true}>
                                    {pageConfig.container}
                                </TabPane>
                            )}
                        </Tabs>
                    </div>
                </div>
                <StatusBar className={styles.statusBar} event={recentEvent} limsUrl={limsUrl}/>
                <TemplateEditorModal/>
                <OpenTemplateModal/>
                <SettingsEditorModal/>
                <SaveUploadDraftModal/>
            </div>
        );
    }

    private onTabChange = (targetKey: string | React.MouseEvent<HTMLElement>, action: "add" | "remove"): void => {
        // currently only one tab is closable so we are not checking targetKey. If this changes, we'll need to
        // add a check here
        if (action === "remove") {
            this.props.closeUploadTab();
        }
    }
}

function mapStateToProps(state: State) {
    return {
        alert: getAlert(state),
        copyInProgress: !getIsSafeToExit(state),
        fileToTags: getFileToTags(state),
        files: getStagedFiles(state),
        folderTreeOpen: getFolderTreeOpen(state),
        limsUrl: getLimsUrl(state),
        loading: getIsLoading(state),
        page: getPage(state),
        recentEvent: getRecentEvent(state),
        selectedFiles: getSelectedFiles(state),
        setMountPointNotificationVisible: getSetMountPointNotificationVisible(state),
        view: getView(state),
    };
}

const dispatchToPropsMap = {
    clearAlert,
    clearStagedFiles,
    closeUploadTab,
    gatherSettings,
    getFilesInFolder: selection.actions.getFilesInFolder,
    loadFilesFromDragAndDrop,
    openFilesFromDialog,
    removeFileFromArchive,
    removeFileFromIsilon,
    requestMetadata,
    selectFile: selection.actions.selectFile,
    selectView,
    setAlert,
    setMountPoint,
    switchEnvironment,
    toggleFolderTree,
    undoFileWellAssociation,
    undoFileWorkflowAssociation,
    updateSettings,
};

export default connect(mapStateToProps, dispatchToPropsMap)(App);

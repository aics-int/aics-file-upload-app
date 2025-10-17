# UI-to-Service Control Flow in AICS File Upload App

This document explains, end-to-end, how a user action in the UI results in an upload request reaching FileManagementService (FMS wrapper) and ultimately the downstream services (JSS, FSS, MMS). It also calls out where and how the custom file name flows through the system.

Overview
- Entry points (user actions):
  - Drag-and-drop files/folders into the selection area
  - Click-to-browse using the system dialog
  - Manual input (dev flag ENABLE_MANUAL_FILE_INPUT)
- Redux selection flow converts raw DOM/Electron inputs into FileModel entries
- Upload flow applies a template (if available/saved) and constructs UploadRequest objects
- Service layer creates a Job (JSS), performs the upload (FSS v4), and completes metadata (MMS)

Key modules/files
- UI entry / container
  - src/renderer/containers/UploadSelectionPage/index.tsx — onDrop handler [lines 57–66](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/containers/UploadSelectionPage/index.tsx#L57-L66)
  - src/renderer/containers/UploadSelectionPage/DragAndDropPrompt/index.tsx — onDrop signature and handlers [lines 13–17, 36–43, 45–55](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/containers/UploadSelectionPage/DragAndDropPrompt/index.tsx#L13-L17)
- Selection branch (converts inputs to FileModel)
  - src/renderer/state/selection/actions.ts (loadFiles) — [lines 30–36](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/selection/actions.ts#L30-L36)
  - src/renderer/state/selection/logics.ts (loadFilesLogic) — [lines 58–66](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/selection/logics.ts#L58-L66)
  - src/renderer/state/selection/types.ts (ManualFileInput) — [lines 28–33](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/selection/types.ts#L28-L33)
- Upload branch (templating, request build, orchestration)
  - src/renderer/state/upload/actions.ts
  - src/renderer/state/upload/logics.ts — addUploadFilesLogic [lines 152–168](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/upload/logics.ts#L152-L168), initiateUploadLogic [lines 170–246](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/upload/logics.ts#L170-L246)
  - src/renderer/state/upload/selectors.ts — getUploadRequests [lines 464–501](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/upload/selectors.ts#L464-L501), getUploadFileNames [lines 503–507](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/upload/selectors.ts#L503-L507)
- Services
  - src/renderer/services/file-management-system/index.ts (FMS orchestrator) — initiateUpload [lines 60–80](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/services/file-management-system/index.ts#L60-L80), upload [lines 280–309](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/services/file-management-system/index.ts#L280-L309), complete [lines 108–149](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/services/file-management-system/index.ts#L108-L149)
  - src/renderer/services/file-storage-service/index.ts (FSS v4 REST) — upload [lines 80–103](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/services/file-storage-service/index.ts#L80-L103)
  - src/renderer/services/types.ts (UploadRequest and service DTOs) — FileMetadataBlock [lines 43–50](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/services/types.ts#L43-L50), UploadRequest [lines 64–69](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/services/types.ts#L64-L69)

1) UI entry points
- UploadSelectionPage renders DragAndDrop and DragAndDropPrompt and wires onDrop to dispatch(loadFiles(...)).
  - File: src/renderer/containers/UploadSelectionPage/index.tsx — [onDrop handler lines 57–66](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/containers/UploadSelectionPage/index.tsx#L57-L66)
    - onDrop handler: dispatch(loadFiles(f))
- DragAndDropPrompt supports:
  - Clicking the drop zone to open a system file dialog via ipcRenderer (SHOW_DIALOG)
  - Manual input form (when ENABLE_MANUAL_FILE_INPUT is true): requires name and path
  - File: src/renderer/containers/UploadSelectionPage/DragAndDropPrompt/index.tsx — [signature and handlers lines 13–17, 36–43, 45–55](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/containers/UploadSelectionPage/DragAndDropPrompt/index.tsx#L13-L17)
    - onDrop signature: Array<string | { path: string; name: string }>
    - Manual submit dispatches onDrop([{ path, name }])
    - Browse dispatches onDrop(filePaths) when user selects paths

2) From onDrop to selection.loadFiles
- Action creator: loadFiles(files)
  - File: src/renderer/state/selection/actions.ts — [lines 30–36](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/selection/actions.ts#L30-L36)
  - Type: LOAD_FILES with payload Array<string | ManualFileInput>
- Logic: loadFilesLogic
  - File: src/renderer/state/selection/logics.ts — mapping payload to FileModel [lines 58–66](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/selection/logics.ts#L58-L66)
  - Retrieves uploadType from selection state
  - Maps the incoming payload into FileModel entries and dispatches addUploadFiles(...)
    - For string inputs (drag & drop / browse):
      - Derives customFileName = basename(item)
      - Adds: { file: item, uploadType, customFileName }
    - For ManualFileInput objects: { path, name }
      - Adds: { file: item.path, uploadType, customFileName: item.name }
  - This ensures a fileName is always present downstream (manual requires name; drag/browse uses basename(path)).

3) addUploadFiles and template application
- addUploadFiles action updates the upload state branch with FileModel entries.
- addUploadFilesLogic checks for an applied template (or saved template preference) and dispatches applyTemplate if present.
  - File: src/renderer/state/upload/logics.ts (addUploadFilesLogic) — [lines 152–168](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/upload/logics.ts#L152-L168)

4) Building UploadRequest objects
- Selector: getUploadRequests
  - File: src/renderer/state/upload/selectors.ts — [lines 464–501](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/upload/selectors.ts#L464-L501)
  - Inputs: current UploadStateBranch, the applied TemplateWithTypeNames, and ShouldBeInLocal selection
  - For each FileModel:
    - Builds customMetadata (templateId + annotations array) by translating FileModel fields via getAnnotations
    - Builds file block with:
      - originalPath: full path on VAST
      - fileName: from FileModel.customFileName (always set by selection flow)
      - fileType: derived via extensionToFileTypeMap
      - shouldBeInArchive: true; shouldBeInLocal: from selection
      - uploadType: File vs Multifile
- getUploadFileNames is also used to present a friendly comma-delimited name list when initiating uploads.

5) Initiating uploads
- Action: initiateUpload
- Logic: initiateUploadLogic
  - File: src/renderer/state/upload/logics.ts — [lines 170–246](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/upload/logics.ts#L170-L246)
  - Creates a groupId for the batch via FileManagementSystem.createUploadGroupId()
  - Reads current user from selection state
  - Calls getUploadRequests to obtain UploadRequest[]
  - For each request, calls fms.initiateUpload(request, user, serviceFields)
    - serviceFields include: groupId and multifile flag (from request.file.uploadType === Multifile)
  - On success: dispatches initiateUploadSucceeded (for notification) and resets the upload wizard state
  - Then schedules the actual upload operations (see next section)

6) Uploading files (FMS -> FSS v4) and tracking (JSS)
- Service orchestrator: FileManagementSystem
  - File: src/renderer/services/file-management-system/index.ts
- initiateUpload(metadata: UploadRequest, user: string, serviceFields: Partial<UploadServiceFields>)
  - Creates a JSS job with:
    - jobName: metadata.file.fileName or basename(originalPath)
    - service: FILE_UPLOAD_APP; status: WAITING; user
    - serviceFields: { files: [metadata], type: "upload", localNasShortcut: shouldBeLocalNasUpload(originalPath), ...serviceFields }
  - Returns the UploadJob (from JSS)
- upload(upload: UploadJob)
  - Extracts source = files[0].file.originalPath and fileName = files[0].file.fileName || basename(source)
  - Derives fileType from fileName extension
  - Calls FSS v4: FileStorageService.upload(fileName, fileType, posixPath(source), "VAST", isMultifile, shouldBeInLocal)
  - Updates JSS job with fssUploadId so retries/cancel can be managed
- complete(upload: UploadJob, fileId: string)
  - Once FSS completes and FSS fileId is known, writes metadata to MMS via mms.createFileMetadata(fileId, metadataWithUploadId)
  - Updates JSS job status to SUCCEEDED and stores result: fileId, fileName, readPath
- retry/cancel paths are also supported via retry and cancel methods, using FSS endpoints and JSS updates.

7) Editing metadata post-upload
- submitFileMetadataUpdateLogic supports editing metadata after an upload completes (e.g., adding a template to a template-less upload). It rebuilds UploadRequest for the selected files and calls MMS edit endpoints, then patches the JSS job's stored serviceFields with the new request for consistency.
  - File: src/renderer/state/upload/logics.ts (submitFileMetadataUpdateLogic) — [lines 642–703](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/upload/logics.ts#L642-L703)

Custom filename handling details
- Manual input requires a name and a path; Drag-and-drop/browse infer the name via basename(path).
- selection/logics.ts loadFilesLogic normalizes all inputs to set FileModel.customFileName — [lines 58–66](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/selection/logics.ts#L58-L66).
- upload/selectors.ts getUploadRequests forwards customFileName as file.fileName for the UploadRequest — [lines 480–491](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/state/upload/selectors.ts#L480-L491).
- file-management-system/index.ts uses the provided fileName wherever it exists:
  - Job name in JSS is metadata.file.fileName || basename(originalPath) — [lines 60–80](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/services/file-management-system/index.ts#L60-L80)
  - Upload call to FSS uses the same fileName when present — [lines 280–296](https://github.com/aicsgithub/aics-file-upload-app/blob/HEAD/src/renderer/services/file-management-system/index.ts#L280-L296)
- This ensures consistent naming across UI, job tracking, and FSS storage.

Sequence diagram (conceptual)
UI (Drag/Drop/Browse/Manual)
  -> dispatch(loadFiles(files))
    selection/logics.loadFilesLogic
      -> dispatch(addUploadFiles(FileModel...))
        upload/logics.addUploadFilesLogic
          -> maybe dispatch(applyTemplate)
User clicks Continue -> dispatch(initiateUpload)
  upload/logics.initiateUploadLogic
    -> getUploadRequests(state)
    -> for each request: fms.initiateUpload(request, user, serviceFields)
      JSS.createJob (WAITING)
    -> for each created job: fms.upload(upload)
      FSS.upload (v4) -> returns uploadId
      JSS.updateJob(serviceFields.fssUploadId = uploadId)
    (later) FSS complete -> FMS.complete(upload, fileId)
      MMS.createFileMetadata(fileId, metadata)
      JSS.updateJob(SUCCEEDED, result: fileId, fileName, readPath)

Key selectors, actions, and logics at a glance
- selection/actions.loadFiles(files)
- selection/logics.loadFilesLogic
- upload/actions.addUploadFiles(files)
- upload/selectors.getUploadRequests(state)
- upload/actions.initiateUpload()
- upload/logics.initiateUploadLogic
- services/file-management-system.initiateUpload, upload, complete
- services/file-storage-service.upload (FSS v4)

Notes and edge cases
- Template application: The system attempts to auto-apply the currently selected template or the saved preferred template whenever files are added.
- Multifile handling: serviceFields.multifile is set for folders or multi-file uploads so FSS treats the source appropriately.
- Local vs archive flags: shouldBeInLocal is driven by selection; shouldBeInArchive is always true.
- Name safety: Non-ASCII checks are applied to annotation values (not to file names) during validation. File names flow as provided/inferred.

This document reflects the code as of the latest changes where manual name is required and drag/browse infer names via basename.
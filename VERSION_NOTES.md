# Version Notes

## 3.4.4 (2/18/25)
- Update to fss v4!

## 3.4.1 (2/18/25)
- Feature: Minor styling updates to "AddMetadataPage".

## 3.4.0 (2/17/25)
- Feature: Reworked upload flow to streamline UX and better support uploading "multifiles", AKA "chunked files".

## 3.3.4 (1/31/25)
- Bugfix: App crashes when editing metadata of cloud-only upload

## 3.1.0 (5/17/23)
- Feature: LocalNasShortcut uploads (files on /allen are copied by server, not sent in chunks by client).

## 3.0.0 (2/15/23)
- Feature: FSS2 chunked uploads: Client sends file in chunks to FSS2 server over HTTP.

## 2.10.0 (10/17/22)
- Feature: FMS.File dropdown selectors now display file names alongside file IDs
- Bugfix: Querying for files in FMS.File dropdown selectors should now return results much faster

## 2.8.1 (06/17/22)
- Bugfix: Date and Datetime annotation values should now be correctly displayed in the post-upload file details screen

## 2.8.0 (02/03/22)
- Feature: User-adjusted column widths in the custom metadata data editor grid will now be transferred to the mass editor grid
- Feature: Previous scene/position/sub-images entries are not lost when attempting to edit said existing ones

## 2.7.0 (10/01/21)
- Feature: Information about who has affected the Metadata Template & the Template's annotations will now be shown.
- Bugfix: User-adjusted column widths will no longer be resized on data changes.

## 2.6.0 (09/01/21)
- Feature: The ordering of annotations within a template can now be controlled by the template creator.
- Feature: Display a status message when an upload has succeeded, yet is potentially not available in the FMS File Explorer
- Bugfix: Retrieve plate barcode mapping from upload draft state

## 2.5.0 (08/03/21)
- Feature: Revamp upload table to provide users with more control and flexibility in viewing them
- Feature: "Easy upload", users can now postpone adding metadata to an upload by uploading without one
- Feature: Revamp imaging session selection allowing multiple plates &/or imaging sessions per upload
- Bugfix: Various bugs fixed with virtualizing long tables

## 2.4.1 (07/12/21)
- Bugfix: Fixed issue with incorrectly formatted file paths when uploading from Windows

## 2.4.0 (07/07/21)
- Feature: Notifications when new app versions are available for download
- Bugfix: Reworked how the app uploads files to improve performance when uploading many files
- Bugfix: Fixed issue where values for annotations with underscores in their name didn't get saved on upload
- Some behind-the-scenes technical rework

## 2.3.0 (05/31/21)
- Feature: Simplified file bundling behavior for more control over retrying failures
- Feature: Ability to edit existing annotations if they have not yet been used in an upload

## 2.2.0 (04/30/21)
- Feature: New template editor
- Feature: Simplified date editor
- Improvement: Modify well editor behavior so it doesn't get cut off by window
- Various other minor fixes

## 2.1.0 (03/31/21)
- Feature: New upload metadata editor
- Feature: Improved UX around upload data entry steps
- Feature: Use existing template as basis when creating new

## 2.0.2 (03/11/21)
- Bugfix: Odd behavior when typing values after selecting a cell with a single click
- Bugfix: Fix propagating to cells by dragging from the corner of a cell

## 2.0.1 (03/02/21)
- Bugfix: Can't associate files with wells after using mass editors
- Bugfix: Network errors after changing settings

## 2.0.0 (02/26/21)
- Version 2 released! This includes:
  - New navigation sidebar
  - Integration of features from previous upload wizard into a single page
  - Ability to upload without a plate or workflow
  - More intuitive validation error behavior
  - New tooltip system for highlighting hard to discover features
- Various minor fixes and usability enhancements

## 1.0.59 (01/29/21)
- Feature: Added new duration annotation type
- Feature: Added ability to add options to dropdown annotations
- Bugfix: Fixed issue where warning is not shown when app is closed during upload
- Various minor fixes and usability enhancements

## 1.0.57 (12/22/20)
- Feature: Added progress tracking for post-upload processing
- Bugfix: Fixed issue loading data from plates with special characters in their barcodes
- Feature: Added ability to mass edit notes

## 1.0.56 (12/3/20)
- Feature: Added ability to mass edit wells in custom data page!
- Bugfix: Grid multi-select not working correctly
- Task: Removed username input from settings
- Task: Removed Search Files tab

## 1.0.55 (11/19/20)
- Feature: indicate unread notifications
- Feature: removed storage intent upload wizard page
- Feature: mass edit rows in custom data page

## 1.0.54 (11/13/20)
- Feature: added ability to mass edit multiple files at once!
- Feature: notification center
- Feature: check if file is a duplicate sooner when retrying an upload

## 1.0.53 (11/4/20)
- Bugfix: self signed the Windows artifact which prevents antivirus software from quarantining the app
- Bugfix: fixed issue where app goes blank when barcode associated with an imaging session gets selected
- Bugfix: Fixed issue with switching environments
- Feature: Improved experience for retrying uploads

## 1.0.52 (10/4/20)
- Bugfix: Improve auto-connection behavior of upload status tracking

## 1.0.51 (10/2/20)
- Bugfix: improved upload status change tracking and removed polling switch
- Feature: view upload metadata in same tab regardless of the upload status

## 1.0.50 (8/20/20)
- Bugfix: fix issue that was preventing progress information from displaying
when a concurrent upload gets triggered

## 1.0.49 (8/19/20)
- Bugfix: show upload progress more transparently
- Feature: automatically retry abandoned uploads on app start

## 1.0.48 (8/12/20)
- Bugfix: Prevent uploads from causing app hangs for large upload sizes

## 1.0.47 (7/27/20)
- Bugfix: don't show Copy link in status bar if nothing to copy
- Bugfix: "Your Uploads" page, All filter wasn't showing successful uploads
- Bugfix: Fix issue with HTTP requests on Linux
- Bugfix: Alphabetize annotations in template editor
- Bugfix: Fix issue where folder tree didn't clear files

## 1.0.46 (6/25/20)
- Behind the scenes changes for how we track channels on a file
- Feature: added Edit action next to uploads so that users can edit and delete files they uploaded
- Feature: warn users when saving changes to a template that will version the template
- Bugfix: fix issue where template editor was not clearing properly after closing

## 1.0.45 (6/16/20)
- Feature: toggle template hint visibility from settings and remember settings even after app closes
- Bugfix: fix upload draft saving mechanism. Now saving to separate files that can be accessed with native file explorer.
- Bugfix: don't show alert when creating a new template


## 1.0.44 (6/4/20)
- Behind the scenes code cleanup and upgrades
- Feature: make workflow editable on custom data page
- Bugfix: fix when undo button on custom data page is enabled
- Bugfix: don't show validation error if user hasn't touched required Yes/No fields 
- Bugfix: update Boolean editor on custom data page
- Bugfix: double clicking notes grid cell was causing issues

## 1.0.43 (5/26/20)
- Bugfix: fix runtime issue

## 1.0.42
- BROKEN version

## 1.0.38 - 1.0.41 
- No visible changes

## 1.0.37 (5/16/20)
- Feature: make main window full screen
- Bugfix: improve upload job polling
- Bugfix: limit alert and status bar heights
- Feature: collapse folder tree on pages not needed
- Feature: header and footer restyling


## 1.0.36 (4/29/20)
- Task: rename annotation types

## 1.0.35 (4/27/20)
- Bugfix: gather username from settings

## 1.0.34 (4/24/20)
- Feature: move upload job actions to upload table to make them easier to find

## 1.0.33 (4/3/20)
- Bugfix: don't show upload job poll error alerts
- Feature: enable users to change username in settings
- Feature: enable saving upload drafts and resuming later

## 1.0.32 (3/11/20)
- Feature: support scenes and sub images identified by name

## 1.0.31 (4/3/20)
- Feature: Allow users to set which username to use for requests
- Feature: Open and Save upload drafts

## 1.0.30 (2/25/20) (1.0.27-1.0.29 testing auto update)
- Feature: Style improvements
- Bugfix: Fix issue with annotations on scenes and channels not being unique per file

## 1.0.26 (2/21/20) (1.0.25 skipped accidentally):
- Feature: Make upload tab closeable
- Feature: cleanup styling, remove icons from progress bar
- Feature: Make file tags closeable on the pages that they get added on

## 1.0.24 (2/18/20):
- Bugfix: fix template selector on Search Files page
- Bugfix: make vial and barcode selectors return results faster

## 1.0.23 (2/6/20):
- Feature: Added support for uploading files from different imaging sessions of one plate together during an upload
- Bugfix: Added missing error validations for dropdown annotations on template editor
- Bugfix: Make error messages clearer when server comes back with validation errors for template editor
- Bugfix: Add more validations to the add custom data grid

## 1.0.22 (1/24/20):
- Bugfix: Fix app hang issues
- Bugfix: Automatically retry failed GET requests that may be due to service deployments


## 1.0.21:
- Bugfix: Fix permissions issues for files copied from isilon
- Bugfix: Update status bar when an upload completes successfully

## 1.0.20:
- Feature: Made folder tree collapsible
- Feature: Allow users to choose which files should be archived and stored on the Isilon
- Feature: Search page improvements
- Feature: Improve Upload Summary Page readability
- Bugfix: Updating a template now updates the grid on the Add Custom Data page
- Bugfix: Clear files in folder tree after an upload
- Bugfix: Fix upload retries


## 1.0.19:
- Feature: Added Search tab for searching for files based on the annotation name and value (strict equality)

## 1.0.18:
- Feature: Allow users to set /allen/aics mount point
- Bugfix: small style changes

## 1.0.17:
- Feature: Updated the Enter Barcode page to be a Select Upload Type page instead
- Bugfix: Fixed page navigation issues
- Bugfix: Behind the scenes improvements for testing

## 1.0.15:
- Bugfix: Fix bug where deleting a row in the custom data grid would remove the child rows

## 1.0.14:
- Feature: We now support annotations that take multiple values. If your annotation is Text or a Number, you can add values
delimited by a comma. For other annotation types, the cell will include an edit icon which will open a new window when clicked
for adding more values
- Feature: The Upload Summary page (with the job statuses) no longer continuously polls for jobs for performance reasons.
 When polling stops, you can manually start it with a Refresh button that will appear
- Feature: Added a shortcut for adding multiple position indexes to a file (i.e. "1, 3, 14-40")
- Feature: Added a Dataset annotation
- Feature: Add support for Date annotation types
- Feature: Allow users to add Scenes/Channels to multiple files
- Feature: Show unrecoverable upload jobs using a grey status circle on the Upload Summary page
- Feature: added more hints in the UI
- Bugfix: clear out data created during an upload after an upload has been initiated
- Bugfix: Display template names and versions
- Bugfix: Allow users to annotate a channel on a file
- Bugfix: Made job statuses more reliable - jobs that failed should show as failed
- Bugfix: Fix bug where existing dropdown annotations could not be added to templates
- Bugfix: Fix issue regarding the annotation named Tag Location
- Bugfix: Fix warning alert as users are closing the app. Sometimes this alert was showing even if there were no jobs in progress

## 1.0.13
- Feature: stopped saving templates in files and started saving them to the database
- Feature: support scenes and channels

## 1.0.12
- Bugfix: Move custom metadata to new location on upload complete request
- Feature: Upload wizard status bar
- Feature: Allow additional files to be dropped on folder tree

## 1.0.11
- Feature: Allow users to retry uploads
- Bugfix: Added more validation to upload process and fixed copies for Windows clients
- Bugfix: Allow LIMS host to be changed at runtime
- Feature: Make loading schema required
- Bugfix: Make notes easier to spread across rows
- Bugfix: Don't allow users to select readonly files for upload

## 1.0.8
- Feature: Updated fields displayed in upload summary page
- Feature: Added job details modal that appears on click of an upload on the upload summary page

## 1.0.7
- Feature: Generate barcode before going to plate standalone
- Bugfix: Removed viability result information from plate page
- Feature: Enabled multi-well selection on plate

## 1.0.6
- Bugfix: validate metadata before uploading. if validation fails,
upload won't be executed.

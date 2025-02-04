# File Upload App

A desktop client for uploading file and file metadata to the Allen Institute for Cell Science's internal file management system (FMS).

## Development

### Step 1: Clone Repo, Install Dependencies

```bash
git clone git@github.com:aics-int/aics-file-upload-app.git
cd file-upload-app
npm i
```

### Step 2: Run Dev Server

```bash
npm run dev
```

### Step 3: Switch to Staging Environment

Switch to the staging environment after the app starts up through the File menu: File > Switch Environments, select the "Staging" button in the dialog.
You can configure the LIMS Host URL to a custom one by going to: File > Settings. 

### Additional Setup notes

* You will need to be on the Allen Institute's VPN when developing against staging (if working from home).
* You will need write access to the Allen Institute's file system in order to use the app.
* If you are working on a Mac, follow these instructions for setting up your Mac for uploads: http://confluence.corp.alleninstitute.org/display/SF/Mac+Setup

## Run Tests

```bash
npm run test
```

## Run Linter

```bash
npm run lint
```

## Prettier
We configured this repository to automatically format code with Prettier upon
committing it. If you would like configure you IDE or editor to run Prettier
before committing, you can find instructions
[here](https://prettier.io/docs/en/editors.html).

## Packaging and Publishing

For an overview of our build pipeline, see [Confluence](http://confluence.corp.alleninstitute.org/display/SF/File+Upload+App+CI+Pipeline)

GitHub Actions will package and publish a new version of the app for all tagged commits that start with "v".
We create tags for snapshots and releases, so the triggering tags will generally look like
"v2.0.1-snapshot-0" or "v2.0.1".

## Release workflow

### Step 1: Create Snapshot
Before releasing an official version of the app, create a snapshot build to test the app on all platforms:

```bash
git checkout main
git pull
git checkout -b v3.3.4-snapshot.0
npm version prerelease --preid=snapshot
```

The last command will create a git tag, update the version in package.json, and a commit with the snapshot version in the message.
If the package.json version was 1.0.55, running this command will change it to 1.0.56-snapshot.0.

In order to trigger a build in GitHub Actions to create the packaged app, push your changes to the remote:

```bash
git push -u origin $(git rev-parse --abbrev-ref HEAD) --follow-tags
```

You can view the GitHub Actions build in progress here: https://github.com/aicsgithub/aics-file-upload-app/actions

### Step 2: Test the Snapshot
The snapshot will be stored in the [file-upload-app.allencell.org S3 bucket](https://s3.console.aws.amazon.com/s3/buckets/file-upload-app.allencell.org/?region=us-west-2&tab=objects). 
You can find the download link for the snapshot by navigating to that bucket and clicking on the snapshot. Alternatively, if you do not have s3 access, you can access download links in [Confluence](http://confluence.corp.alleninstitute.org/display/SF/File+Upload+Application#FileUploadApplication-DownloadLinks)

Run a set of smoke tests for each packaged version of the app. At minimum upload a file and view the upload,
ensuring that the metadata looks correct

Ideally, you should try out the app in all platforms before each big release: Windows, Linux, and Mac.

### Step 3: Create Release
A release is an official version of the app. You can create a release from the command line.
Ensure you are on the main branch and have the latest:

```bash
git checkout main
git pull
git checkout -b v3.3.4  # your version number
```

Create the release using the `npm version` command. It will ask you to enter the new version.

```bash
npm version <major|minor|patch>
```

Update the VERSION_NOTES.md file with what is new in this release. I typically look through
the commits for merged PR's.

After updating the notes, add and commit them and push everything to the git remote.

```bash
git add .
git commit -m "update version notes"
git push -u origin $(git rev-parse --abbrev-ref HEAD) --follow-tags
```

You can look at the GitHub Actions build by going to https://github.com/aicsgithub/aics-file-upload-app/actions.

Open and merge a Pull Request for the version bump before merging any other PRs.

### Step 4: Check Download Page
The download page, [located here](https://aics-int.github.io/aics-file-upload-app/), will automatically update with the new build, if successful. 
Be sure to notify the team of your updates via the #file-upload-app Slack channel!

### Packaging the app locally

To create an executable that will allow you to test a production build of the
app, you can run `npm run build-executable`. The executable will be built to the
`dist` directory.

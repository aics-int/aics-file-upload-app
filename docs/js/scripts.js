const OS = {
    WINDOWS: "Windows",
    MAC: "Mac",
    LINUX: "Linux",
    UNKNOWN: "Unknown",
};
const FILE_TYPE_FOR_OS = {
    [OS.WINDOWS]: "exe",
    [OS.MAC]: "dmg",
    [OS.LINUX]: "AppImage",
};
const INSTRUCTIONS_FOR_OS = {
    [OS.WINDOWS]: [
        "Click the 'Download' button to the left",
        "Move the downloaded executable from your Downloads folder to a more durable location. Note that ITO prevents executables from being stored <i>directly</i> on either your Desktop or in your Documents folder. The executable can, however, be placed within a folder in either location (e.g. <code>Desktop\\File Upload App\\uploader.exe</code>).",
        '<strong>Recommendation:</strong> store the executable in someplace like <code>C:\\Users\\someuser\\File Upload App\\</code>. Once there, you can right-click on the .exe and select "Send to" -> "Desktop (create shortcut)" to make it more convenient to find.',
        '<strong>If on Windows 10:</strong> the <i>first</i> time you run the application, you\'ll see a blue pop-up warning that "Windows protected your PC." To continue, click "More Info," then press the "Run anyway" button.',
        'Recommendation: When downloading new versions, replace the old executable (the downloaded app) with the new one, this can be done by manually deleting it or naming the newly downloaded app the same name as the old version downloaded.'
    ],
    [OS.MAC]: [
        "Recommendation: Until the Isilon is no more, we recommend remoting into a Windows computer to upload your files if possible.",
        "Click the 'Download' button to the left.",
        `
        Depending on your browser you may have to answer one of the prompts below:
        <ul>
            <li>
                <figure class="figure installation-instr">
                    <img class="screenshot" src="resources/installation/macos-open-with-safari.png">
                    <figcaption class="figure-caption">
                    Safari may ask for permission to download from AWS (where we store the application), click 'Allow'.
                    </figcaption>
                </figure>
            </li>
            <li>
                <figure class="figure installation-instr">
                    <img class="screenshot" src="resources/installation/macos-open-with-firefox.png">
                    <figcaption class="figure-caption">
                    Firefox may prompt for where and how to store the app, select 'Open with DiskImageMounter (default).' & click 'Ok'.

                    </figcaption>
                </figure>
            </li>
            <li>
                Other browsers are unlikely to ask anything. If one does, and you are unsure what to do, feel free to reach out.
            </li>
        </ul>
        `,
        `
        <figure class="figure installation-instr">
            <img class="screenshot" src="resources/installation/macos-drag-into-applications.png">
            <figcaption class="figure-caption">
            Drag and drop the File Upload App icon onto the Applications folder icon. If prompted to 'Keep Both,' 'Stop,' or 'Replace,' choose 'Replace.'
            </figcaption>
        </figure>
        `,
        `
        <figure class="figure installation-instr">
            <img class="screenshot" src="resources/installation/macos-open-after-first-time.png">
            <figcaption class="figure-caption">
            If this isn't your first time installing the File Upload App, you may be given this prompt, here you'll want to click 'Replace'.
            </figcaption>
        </figure>
        `,
        `
        <figure class="figure installation-instr">
            <img class="screenshot" src="resources/installation/macos-locate-application.png">
            <figcaption class="figure-caption">
            Open Finder, and locate the File Upload App in Applications.
            </figcaption>
        </figure>
        `,
        "Right-click on the File Upload App, select 'Open.' <em>You may need to do this twice in order to get to the next step</em>.",
        `
        <figure class="figure installation-instr">
            <img class="screenshot" src="resources/installation/macos-open-anyway.png">
            <figcaption class="figure-caption">
            You should be prompted with an alert that reads, "macOS cannot verify the developer of 'File Upload App'. Are you sure you want to open it?" Select "Open."
            </figcaption>
        </figure>
        `,
        `
        <figure class="figure installation-instr">
            <img class="screenshot" src="resources/installation/macos-connect-to-fms-storage.png">
            <figcaption class="figure-caption">
            Until the Isilon is fully non-existent, you'll need to mount FMS storage on your computer.
            To do this: <code>Go</code> → <code>Connect to server</code> → enter <code>smb://allen/programs</code> → <code>Connect</code>.
            <strong>Note! This is only possible when connected to the Allen Institute network; you will be unable to do this
            over VPN.</strong>
            </figcaption>
        </figure>
        `,
    ],
    [OS.LINUX]: [
        "Click the 'Download' button to the left",
        "Locate the download in file browser",
        "Right-click the download",
        'Select the "Properties" dropdown option',
        'Click the "Permissions" tab',
        'Ensure "Allow executing file as program" is checked',
        "Click to open as you would any other application",
    ],
};
const REPO_OWNER = "aics-int";
const REPO = "aics-file-upload-app";
const S3_BUCKET = "https://s3-us-west-2.amazonaws.com/file-upload-app.allencell.org";

function updateDownloadLink(release) {
    const operatingSystem = document.getElementById("os-selector").value;
    // Disable the download button if we have an unknown OS
    if (operatingSystem === OS.UNKNOWN) {
        const downloadButton = document.getElementById("download-button");
        downloadButton.disabled = true;
    } else {
        const assetForOs = `file-upload-app-${release}.${FILE_TYPE_FOR_OS[operatingSystem]}`;
        const downloadLink = document.getElementById("download-link");
        downloadLink.href = `${S3_BUCKET}/${assetForOs}`;
        downloadLink.download = assetForOs;
    }
}

function selectOperatingSystem(os) {
    document.getElementById("download-button").innerHTML = `Download for ${os}`;
    document.getElementById(
        "installation-instructions"
    ).innerHTML = `Installation instructions for ${os}`;
    const instructionsElement = document.getElementById("instructions");
    instructionsElement.innerHTML = "";
    INSTRUCTIONS_FOR_OS[os].forEach((instruction) => {
        const paragraph = document.createElement("li");
        paragraph.innerHTML = instruction;
        instructionsElement.appendChild(paragraph);
    });
    const versionSelector = document.getElementById("version-selector");
    versionSelector.value && updateDownloadLink(versionSelector.value);
}

// Fetch the list of release tags for the File Upload App & initialize related features
function fetchReleaseTags() {
    fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO}/git/refs/tags%2Fv`)
        .then((response) => {
            if (!response.ok) {
                throw Error(response.statusText);
            }
            return response.json();
        })
        .then((data) => {
            const releases = data
                .filter((releaseTag) => !releaseTag["ref"].includes("snapshot"))
                .map((releaseTag) => (
                    releaseTag["ref"]
                        .split("tags/v")[1] // Separate tag from reference
                        .split('.') // Split tag into individual version parts (major, minor, patch)
                        .map(versionPart => +versionPart + 100000) // Pad individual parts (enables natural sorting)
                        .join('.')
                ))
                .reverse()
                // Remove padding that enabled natural sort
                .map((paddedReleaseTag) => (
                    paddedReleaseTag.split('.')
                        .map(versionPart => +versionPart - 100000)
                        .join('.')
                ))
            const versionSelector = document.getElementById("version-selector");
            releases.forEach((releaseTag, index) => {
                const option = document.createElement("option");
                option.value = releaseTag;
                option.innerHTML = releaseTag;
                if (index === 0) {
                    option.innerHTML += " (latest)";
                }
                versionSelector.appendChild(option);
            });
            versionSelector.value = releases[0];
            localStorage.setItem("releases", JSON.stringify(releases)); // Store data
            updateDownloadLink(releases[0]);
        })
        .catch((error) => {
            console.error(error);
            alert(error.message);
        });
}

function initialize() {
    // Fetch release tags for the File Upload App
    fetchReleaseTags();

    // Determine operating system
    let os;
    if (navigator.appVersion.indexOf("Win") !== -1) {
        os = OS.WINDOWS;
    } else if (navigator.appVersion.indexOf("Mac") !== -1) {
        os = OS.MAC;
    } else if (navigator.appVersion.indexOf("Linux") !== -1) {
        os = OS.LINUX;
    } else {
        os = OS.UNKNOWN;
    }

    // Initialize the operating system selector
    const osSelector = document.getElementById("os-selector");
    Object.values(OS)
        .filter((o) => o !== OS.UNKNOWN)
        .forEach((operatingSystem) => {
            const option = document.createElement("option");
            option.value = operatingSystem;
            option.innerHTML = operatingSystem;
            osSelector.appendChild(option);
        });
    osSelector.value = os;

    // If we could not determine the operating system, report feedback to user
    // & auto-enable changing the operating system manually
    if (os === OS.UNKNOWN) {
        alert(
            "Could not determine operating system, please select a different one using the dropdown"
        );
    }

    // Update dialog
    selectOperatingSystem(os);
}

///////// Initialize App ///////////
initialize();

// if a user clicked on a nav item then clicked the "back button," this will scroll the user back to the top
// of the page
window.addEventListener("hashchange", (event) => {
    const newUrl = new URL(event.newURL);
    if (!newUrl.hash) {
        // scroll to top
        const contentContainer = document.getElementById("secondary-column");
        if (contentContainer) {
            contentContainer.scroll(0, 0);
        }
    }
});

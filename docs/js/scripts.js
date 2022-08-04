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
const TUTORIALS = [
    {
        title: "Uploading with a metadata template",
        slides: [
            {
                caption: "To begin an upload select the '+ Upload' button on the navigation bar. The prompt will ask if you'd like to upload a selection of files or an entire folder as well as whether you'd prefer to upload with a metadata template now or later. A 'metadata template' is a set of annotations you or someone on your team can create to both a) keep a minimum set of annotations required and/or b) use the same annotations consistently. This tutorial is for uploading WITH a metadata template.",
                image: "resources/tutorial/upload_with_metadata_template/upload_button_open.png"
            },
            {
                caption: "The first part of an upload is telling the app which files to upload. Either browse for some files or drag and drop them onto the screen. Note: there is a prompt at the bottom of the data entry grid to continue adding files to upload as many times as you'd like after this.",
                image: "resources/tutorial/upload_with_metadata_template/drag_n_drop_example.png"
            },
            {
                caption: "Next you'll be asked to select a metadata template to upload your files with. Someone on your team likely knows which one you could/should use, but if not see the 'Creating a metadata template' tutorial",
                image: "resources/tutorial/upload_with_metadata_template/template_selection.png"
            },
            {
                caption: "(Optional) Once you've selected a template you'll be shown a data grid where each row is a file and each column is an annotation that will be associated with your files. By default some columns are provided for everyone, one of those is Plate Barcode. This is a special column for those that wish to associate their files with a Plate Well which can be powerful since it will allow us to automatically extract a lot of metadata for this file.",
                image: "resources/tutorial/upload_with_metadata_template/plate_barcode_selection.png"
            },
            {
                caption: "(Optional) If you've selected a Plate Barcode to associate with your files then a Well column will appear to more specifically associate the file with specific wells",
                image: "resources/tutorial/upload_with_metadata_template/well_selection.png"
            },
            {
                caption: "(Note) Some columns may be required (noted by the * at the end of their name) which means at a minimum those annotations must be entered for each file. This is controlled as a template level, ask the owner of the template if something should be made optional.",
                image: "resources/tutorial/upload_with_metadata_template/column_required_prompt.png"
            },
            {
                caption: "All columns will have a specific editor for their data type, meaning some annotations are Dates so the app will show a calendar, some are dropdowns, others are numeric entries, etc. This is to try to keep all data for a specific annotation consistent.",
                image: "resources/tutorial/upload_with_metadata_template/column_entry_example.png"
            },
            {
                caption: "Once the template has been filled out to your liking you can begin the actual upload by clicking the 'Upload' button at the bottom of the screen.",
                image: "resources/tutorial/upload_with_metadata_template/completed_template.png"
            },
            {
                caption: "You can monitor the progress of your upload from the 'My Uploads' page.",
                image: "resources/tutorial/upload_with_metadata_template/uploading_file_with_metadata.png"
            },
            {
                caption: "To view a more specific status hover over or the progress icon, this is also where details about errors will be shown if any ever occur.",
                image: "resources/tutorial/upload_with_metadata_template/upload_status_tooltip.png"
            },
        ]
    },
    {
        title: "Uploading without a metadata template",
        slides: [
            {
                caption: "To begin an upload select the '+ Upload' button on the navigation bar. The prompt will ask if you'd like to upload a selection of files or an entire folder as well as whether you'd prefer to upload with a metadata template now or later. A 'metadata template' is a set of annotations you or someone on your team can create to both a) keep a minimum set of annotations required and/or b) use the same annotations consistently. This tutorial is for uploading WITHOUT a metadata template.",
                image: "resources/tutorial/upload_without_metadata_template/upload_button_open.png"
            },
            {
                caption: "Select the files or folder you'd like to upload.",
                image: "resources/tutorial/upload_without_metadata_template/browse_prompt.png"
            },
            {
                caption: "You can monitor the progress of your upload from the 'My Uploads' page. Once uploaded you can select your files then click the 'View' button at the top to associate them with metadata, see the 'Viewing / Editing uploaded files' metadata' tutorial for an example.",
                image: "resources/tutorial/upload_without_metadata_template/uploading_file_without_metadata.png"
            },
            {
                caption: "To view a more specific status hover over or the progress icon, this is also where details about errors will be shown if any ever occur.",
                image: "resources/tutorial/upload_without_metadata_template/upload_status_tooltip.png"
            },
        ]
    },
    {
        title: "Creating a metadata template",
        slides: [
            {
                caption: "The template creation UI can be accessed either through the template selection dropdown while you are uploading files or by accessing the toolbar and navigating File > New > Template.",
                image: "resources/tutorial/create_template/create_template_options.png",
            },
            {
                caption: "To begin you'll want to find a unique name to give your template. This template will be visible to everyone in the institute, so making its purpose clear is generally helpful. Note: You can also copy from an existing Template if there is a template that has similar annotations (this will just add the same annotations that the other template has to this new template).",
                image: "resources/tutorial/create_template/empty_template.png",
            },
            {
                caption: "Your template will need some annotations, so to add them hover over the + icon and then scroll through the list of available annotations selecting any you'd like to add. If you accidently add one don't worry you can remove them. If you think of an annotation that isn't in the list & that you'd like created, see the 'Creating an annotation' tutorial.",
                image: "resources/tutorial/create_template/add_annotation.png",
            },
            {
                caption: "Tip: To enforce filling out data for an annotation on each use of this template check the 'Required' checkbox next to the annotation you'd like required.",
                image: "resources/tutorial/create_template/required_checkbox.png",
            },
            {
                caption: "Now that you have your annotations added you can double check their properties, remove, or edit them using the action buttons. Keep in mind that annotations are available to everyone, editing them will affect everyone using them. The order of the annotations in the list is the order they will be shown in the metadata grid when uploading files, you can edit this and anything else about the template *except the name* anytime. Click 'Save' at the bottom when you'd like your changes saved. Templates, when edited, are versioned meaning we keep a record of all past versions of your templates just in case you'd like to discern between which files were uploaded with which version later on.",
                image: "resources/tutorial/create_template/annotation_interactions.png",
            },
        ]
    },
    {
        title: "Editing a metadata template",
        slides: [
            {
                caption: "To access the edit UI navigate to the toolbar at the top of the screen and go to File > Open > Template.",
                image: "resources/tutorial/edit_template/edit_template_button.png",
            },
            {
                caption: "Select the template you'd like to edit.",
                image: "resources/tutorial/edit_template/template_options.png",
            },
            {
                caption: "Here you'll be able to update the annotations for a template. Hover over the + icon to add annotations.",
                image: "resources/tutorial/edit_template/existing_template.png",
            },
            {
                caption: "To edit or remove annotations see the corresponding action buttons for the annotation you'd like editted or removed. Click 'Save' at the bottom of the template UI to finalize your changes.",
                image: "resources/tutorial/create_template/annotation_interactions.png",
            },
        ]
    },
    {
        title: "Creating an annotation",
        slides: [
            {
                caption: "To access the create annotation UI you'll need to first access the Create or Edit template UI, to do so see the 'Creating a metadata template' or 'Editing a metadata template' tutorials. Once you arrive at a UI similar to the one shown in this picture you're ready to being this tutorial.",
                image: "resources/tutorial/create_annotation/existing_template.png",
            },
            {
                caption: "Navigate to the add annotation UI by hovering over the + icon.",
                image: "resources/tutorial/create_annotation/add_annotation.png",
            },
            {
                caption: "Enter in the unique descriptive name for this annotation along with a description that will help describe to everyone else in the institute what exactly this annotation is meant to represent.",
                image: "resources/tutorial/create_annotation/create_annotation_ui.png",
            },
            {
                caption: "Lastly, select a data type that fits for your data. This choice is what affects the type of editor the app will give you along with what query options are available downstream in the FMS File Explorer. Text types are the most generic, Number is great for just numeric entries, Date is for dates without times (ex. May 5, 2022), Datetime is most specific for dates with times (ex, May 5, 2022 8:34:21), YesNo is for when the annotation is just a flag whether something is true or not (ex. Is Aligned?), Duration is for representing an amount of time (ex. 4 hours, 3 minutes, 2 seconds), Dropdown is for when an annotation can have only a few select options (ex. a 'Color' annotation could have the options 'Blue', 'Green', & 'Red'), Lookup is a special type that is essentially a dropdown but where the options are automatically provided by selecting a LabKey database table to extract values from.",
                image: "resources/tutorial/create_annotation/data_type_dropdown.png",
            }
        ]
    },
    {
        title: "Editing an annotation",
        slides: [
            {
                caption: "To access the edit annotation UI you'll need to first access the Create or Edit template UI that has the annotation you'd like to edit, to do so see the 'Creating a metadata template' or 'Editing a metadata template' tutorials. Once you arrive at a UI similar to the one shown in this picture you're ready to being this tutorial.",
                image: "resources/tutorial/edit_annotation/existing_template.png",
            },
            {
                caption: "Select the pencil like icon for annotation you'd like to edit to launch the edit annotation UI. Note: editing this annotation will affect everyone else using this annotation.",
                image: "resources/tutorial/edit_annotation/edit_icon.png",
            },
            {
                caption: "Once you've arrived here *if* the annotation has *not* been used to upload a file yet you can make any edits you'd like. However, if files have been used with this annotation editing is limited largely to protect the data of other users. If you'd like to make the change regardless, like changing the name, reach out to the Software team.",
                image: "resources/tutorial/edit_annotation/edit_annotation_ui.png",
            }
        ]
    },
    {
        title: "Viewing / Editing uploaded files' metadata",
        slides: [
            {
                caption: "From the 'My Uploads' page select some successfully uploaded files using the checkbox left of their name, then select the 'View' button near the top left of the screen.",
                image: "resources/tutorial/viewing_metadata/upload_buttons.png",
            },
            {
                caption: "If you already have associated metadata with the files then the template with all the metadata you associated them with will be filled in, otherwise if no template has been associated with them then you'll need to select one if you want to add metadata. If you add, remove, or update any of the metadata select 'Update' at the bottom of the screen to finalize your changes.",
                image: "resources/tutorial/viewing_metadata/metadata_view_example.png",
            }
        ]
    },
    {
        title: "Miscellaneous helpful features",
        slides: [
            {
                caption: "While uploading multiple files at once you can edit as many of them at one time as you'd like by selecting them using their corresponding checkboxes and then clicking the pencil icon. This will launch a mini grid where any annotations you update will replace those same annotations for the files you selected.",
                image: "resources/tutorial/misc/mass_edit.png"
            },
            {
                caption: "If you'd like to save your progress (the files and their metadata) while uploading files, click the 'Cancel' button at the bottom of the screen & save the upload draft somewhere you'll remember on your machine. To resume your progress later navigate to the toolbar and select File > Open > Upload Draft and find the upload draft file you saved previously.",
                image: "resources/tutorial/misc/upload_draft.png"
            },
            {
                caption: "This is the notifations view where you can view and past notifications, the status bar at the very bottom of the page will also briefly display these.",
                image: "resources/tutorial/misc/notifications.png"
            },
            {
                caption: "The settings panel is where you can toggle various features of the application, including filtering down the notifications you receive.",
                image: "resources/tutorial/misc/settings.png"
            },
        ]
    },
]
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


function buildTutorialSlideshow() {
    let idxOfCurrentSlide = 0;
    let idxOfCurrentTutorial = 0;
    const slideContainer = document.getElementById("tutorial-slide");
    const slideCaption = document.getElementById("tutorial-slide-caption");
    const tutorialList = document.getElementById("tutorial-list");

    const selectTutorialSlide = (selectedSlideIndex) => {
        idxOfCurrentSlide = selectedSlideIndex;

        // Replace old slide with new slide
        const tutorial = TUTORIALS[idxOfCurrentTutorial];
        slideContainer.src = tutorial.slides[selectedSlideIndex].image;
        slideCaption.innerHTML = tutorial.slides[selectedSlideIndex].caption;

        // Update the previous and next slide buttons
        const prevSlideButton = document.querySelector("#prev-slide-button");
        const nextSlideButton = document.querySelector("#next-slide-button");
        if (selectedSlideIndex <= 0 && idxOfCurrentTutorial <= 0) {
            prevSlideButton.classList.add("disabled");
        } else {
            prevSlideButton.classList.remove("disabled");
        }
        if (selectedSlideIndex >= tutorial.slides.length - 1 && idxOfCurrentTutorial >= TUTORIALS.length - 1) {
            nextSlideButton.classList.add("disabled");
        } else {
            nextSlideButton.classList.remove("disabled");
        }
        prevSlideButton.onclick = selectPreviousSlide;
        nextSlideButton.onclick = selectNextSlide;

        // Update slide selection for dots visually
        const previouslySelectedSlideDot = document.querySelector(`.dot.selected`);
        if (previouslySelectedSlideDot) {
            previouslySelectedSlideDot.classList.remove("selected");
        }
        const newlySelectedSlideDot = document.querySelector(`#slide-dot-${selectedSlideIndex}`);
        newlySelectedSlideDot.classList.add("selected");
    };

    // Renders the dots for slide selection for the tutorial selected
    const renderSlideSelectionDotsForTutorial = (tutorial) => {
        // Replace old slide dots with new ones
        const tutorialSlideDotContainer = document.querySelector("#slide-dot-container");
        tutorialSlideDotContainer.innerHTML = "";  // Removes old nodes
        const slideDotItems = tutorial.slides.map((_, idxOfSlide) => {
            const slideDotItem = document.createElement("span");
            slideDotItem.id = `slide-dot-${idxOfSlide}`;
            slideDotItem.classList.add("dot");
            slideDotItem.onclick = () => {
                selectTutorialSlide(idxOfSlide);
            }
            return slideDotItem;
        });

        tutorialSlideDotContainer.append(...slideDotItems);
    }

    const selectTutorial = (selectedTutorialIndex, selectedSlideIndex = 0) => {
        idxOfCurrentTutorial = selectedTutorialIndex;

        // Render the dots below the slideshow
        renderSlideSelectionDotsForTutorial(TUTORIALS[selectedTutorialIndex]);

        // Visually deselect previously selected tutorial
        const previouslySelectedTutorial = document.querySelector("#tutorial-list .tutorial-list-item.selected");
        if (previouslySelectedTutorial) {
            previouslySelectedTutorial.classList.remove("selected");
        }
    
        // Visually select newly selected tutorial
        const newlySelectedTutorial = document.querySelector(`#tutorial-list-item-${selectedTutorialIndex}`)
        newlySelectedTutorial.classList.add("selected");

        // Select initial slide for tutorial
        selectTutorialSlide(selectedSlideIndex);
    }

    const selectPreviousSlide = () => {
        if (idxOfCurrentSlide > 0) {
            selectTutorialSlide(idxOfCurrentSlide - 1);
        } else if (idxOfCurrentTutorial > 0) {
            selectTutorial(idxOfCurrentTutorial - 1, TUTORIALS[idxOfCurrentTutorial - 1].slides.length - 1);
        }
    }
    const selectNextSlide = () => {
        if (idxOfCurrentSlide < TUTORIALS[idxOfCurrentTutorial].slides.length - 1) {
            selectTutorialSlide(idxOfCurrentSlide + 1);
        } else if (idxOfCurrentTutorial < TUTORIALS.length - 1) {
            selectTutorial(idxOfCurrentTutorial + 1);
        }
    };

    // Keybind the left and right arrow keys to allow navigating the slideshow
    document.onkeyup = function(e) {
        switch (e.key) {
            case "ArrowLeft":
                selectPreviousSlide();
                break;
            case "ArrowRight":
                selectNextSlide();
                break;
        }
    };

    // Builds the list of available tutorials, needs only happen once
    const tutorialListItems = TUTORIALS.map((tutorial, idxOfTutorial) => {
        const tutorialListItem = document.createElement("li");
        tutorialListItem.id = `tutorial-list-item-${idxOfTutorial}`;
        tutorialListItem.classList.add("tutorial-list-item", "link");
        tutorialListItem.innerText = tutorial.title;
        tutorialListItem.onclick = () => {
            selectTutorial(idxOfTutorial);
        };

        return tutorialListItem;
    });

    tutorialList.append(...tutorialListItems);

    // initialize to the first item
    selectTutorial(idxOfCurrentTutorial);
}

function initialize() {
    // Fetch release tags for the File Upload App
    fetchReleaseTags();

    // Determine operating system
    let os;
    if (navigator.userAgent.toLowerCase().indexOf("win") !== -1) {
        os = OS.WINDOWS;
    } else if (navigator.userAgent.toLowerCase().indexOf("mac") !== -1) {
        os = OS.MAC;
    } else if (navigator.userAgent.toLowerCase().indexOf("linux") !== -1) {
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

    buildTutorialSlideshow();
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

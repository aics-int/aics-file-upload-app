import { expect } from "chai";
import { Action } from "redux-logic";

import { JSSJobStatus, Service } from "../../../services/job-status-service/types";
import { JSSJob } from "../../../services/job-status-service/types";
import { updateUploadProgressInfo } from "../../../state/job/actions";
import { Step } from "../../Table/CustomCells/StatusCell/Step";
import { handleUploadJobUpdates } from "../index";

describe("App", () => {
    describe("handleUploadJobUpdates", () => {
        [
            {
                serviceFields: {
                    preUploadMd5: 5,
                    fileSize: 10
                }, 
                step: Step.ONE, 
                progressField: "preUploadMd5"
            },
            {
                serviceFields: {
                    preUploadMd5: 10,
                    fileSize: 10,
                    currentFileSize: 5,
                }, 
                step: Step.TWO,
                progressField: "currentFileSize"
            },
            {
                serviceFields: {
                    preUploadMd5: 10,
                    currentFileSize: 10,
                    postUploadMd5: 5,
                    fileSize: 10,
                }, 
                step: Step.THREE,
                progressField: "postUploadMd5"
            },
        ].forEach(({serviceFields, step, progressField}) => {
            it("dispatches updateUploadProgressInfo when pre-upload-md5 is in progress", () => {
                // Arrange
                const fssJob: JSSJob = {
                    created: new Date(),
                    jobId: "foo123",
                    jobName: "test_file.txt",
                    modified: new Date(),
                    originationHost: "dev-aics-fup-001",
                    service: Service.FILE_STORAGE_SERVICE,
                    updateParent: false,
                    user: "fakeuser",
                    status: JSSJobStatus.WORKING,
                    serviceFields,
                };
                let actionPersisted = undefined;
                const dispatch = (action: Action)=>{
                    actionPersisted = action;
                }; 
                const expectedAction = updateUploadProgressInfo(fssJob.jobId, { bytesUploaded: fssJob.serviceFields && fssJob.serviceFields[progressField], totalBytes: fssJob.serviceFields?.fileSize, step: step })
                // Act
                handleUploadJobUpdates(fssJob, dispatch);
                // Assert
                expect(actionPersisted).to.deep.equal(expectedAction);
            });
        });
    });
});
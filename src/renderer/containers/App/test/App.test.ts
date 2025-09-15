import { expect } from "chai";
import { Action } from "redux-logic";

import { JSSJobStatus, Service } from "../../../services/job-status-service/types";
import { JSSJob } from "../../../services/job-status-service/types";
import { updateUploadProgressInfo } from "../../../state/job/actions";
import { Step } from "../../Table/CustomCells/StatusCell/Step";
import { handleUploadJobUpdates } from "../handleUploadJobUpdates";

describe("App", () => {
    describe("handleUploadJobUpdates", () => {
        [
            {
                serviceFields: {
                checksumProgress: 5,
                fileSize: 10
                },
                step: Step.ONE_CHECKSUM,
                progressField: "checksumProgress"
            },
            {
                serviceFields: {
                checksumProgress: 10,
                fileSize: 10,
                s3UploadProgress: 5,
                },
                step: Step.TWO,
                progressField: "s3UploadProgress"
            },
            ].forEach(({ serviceFields, step, progressField }) => {
            it("dispatches updateUploadProgressInfo when upload is in progress", () => {
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

                let actionPersisted: any = undefined;
                const dispatch = (action: Action) => {
                actionPersisted = action;
                };

                const expectedAction = updateUploadProgressInfo(fssJob.jobId, {
                    bytesUploaded: fssJob.serviceFields?.[progressField],
                    totalBytes: fssJob.serviceFields?.fileSize,
                    step,
                });

                handleUploadJobUpdates(fssJob, dispatch);
                expect(actionPersisted).to.deep.equal(expectedAction);
            });
        });
    });
    it("dispatches updateUploadProgressInfo when multifile progress is updated", () => {
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
            serviceFields: {
                multifile: true,
                fileSize: 100,
                subfiles: {
                    'fileid1': 10,
                    'fileid2': 10,
                    'fileid3': 15
                },
            },
        };
        let actionPersisted = undefined;
        const dispatch = (action: Action)=>{
            actionPersisted = action;
        };
        const expectedAction = updateUploadProgressInfo(fssJob.jobId, { bytesUploaded: 35, totalBytes: fssJob.serviceFields?.fileSize, step: Step.TWO })
        // Act
        handleUploadJobUpdates(fssJob, dispatch);
        // Assert
        expect(actionPersisted).to.deep.equal(expectedAction);
    });
});
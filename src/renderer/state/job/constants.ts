import { makeConstant } from "../util";

const BRANCH_NAME = "jobs";

export const RECEIVE_JOBS = makeConstant(BRANCH_NAME, "receive-jobs");
export const RECEIVE_JOB_UPDATE = makeConstant(
  BRANCH_NAME,
  "receive-job-update"
);
export const SET_LAST_SELECTED_UPLOAD = makeConstant(
  BRANCH_NAME,
  "set-last-selected-upload"
);

import { makeConstant } from "../util";

const BRANCH_NAME = "setting";

export const GATHER_SETTINGS = makeConstant(BRANCH_NAME, "gather-settings");
export const UPDATE_SETTINGS = makeConstant(BRANCH_NAME, "update-settings");
export const OPEN_ENVIRONMENT_DIALOG = makeConstant(
  BRANCH_NAME,
  "open-environment-dialog"
);

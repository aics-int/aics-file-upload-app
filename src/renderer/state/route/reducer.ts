import { AnyAction } from "redux";

import { TypeToDescriptionMap } from "../types";
import { makeReducer } from "../util";
import { SELECT_PAGE, SELECT_VIEW } from "./constants";
import { Page, RouteStateBranch, SelectPageAction, SelectViewAction } from "./types";

export const initialState: RouteStateBranch = {
    page: Page.UploadSummary,
    view: Page.UploadSummary,
};

const actionToConfigMap: TypeToDescriptionMap = {
    [SELECT_PAGE]: {
        accepts: (action: AnyAction): action is SelectPageAction => action.type === SELECT_PAGE,
        perform: (state: RouteStateBranch, action: SelectPageAction) => ({
            ...state,
            page: action.payload.nextPage,
            view: action.payload.nextPage,
        }),
    },
    [SELECT_VIEW]: {
        accepts: (action: AnyAction): action is SelectViewAction => action.type === SELECT_VIEW,
        perform: (state: RouteStateBranch, action: SelectViewAction) => ({
            ...state,
            view: action.payload,
        }),
    },
};

export default makeReducer<RouteStateBranch>(actionToConfigMap, initialState);
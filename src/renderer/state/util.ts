import { AnyAction, Reducer } from "redux";
import { FilterFunction, StateWithHistory } from "redux-undo";

import { APP_ID } from "../constants";

import { BatchedAction, TypeToDescriptionMap } from "./types";

export function makeConstant(associatedReducer: string, actionType: string) {
  return `${APP_ID}/${associatedReducer.toUpperCase()}/${actionType.toUpperCase()}`;
}

export function makeReducer<S>(
  typeToDescriptionMap: TypeToDescriptionMap<S>,
  initialState: S
): Reducer<S> {
  return (state: S = initialState, action: AnyAction) => {
    const description = typeToDescriptionMap[action.type];
    if (!description) {
      return state;
    }

    if (description.accepts(action)) {
      return description.perform(state, action);
    }

    return state;
  };
}

const BATCH_ACTIONS = makeConstant("batch", "batch-actions");

export function batchActions(
  actions: AnyAction[],
  type: string = BATCH_ACTIONS
): BatchedAction {
  return { type, batch: true, payload: actions };
}

function actionIsBatched(action: AnyAction): action is BatchedAction {
  return action && action.batch && Array.isArray(action.payload);
}

export function enableBatching<S>(reducer: Reducer<S>): Reducer<S> {
  return function batchingReducer(state: S | undefined, action: AnyAction): S {
    if (actionIsBatched(action) && state) {
      return action.payload.reduce(batchingReducer, state);
    }
    return reducer(state, action);
  };
}

export function getActionFromBatch(
  batchAction: AnyAction,
  type: string
): AnyAction | undefined {
  if (actionIsBatched(batchAction) && type) {
    const actions = batchAction.payload;
    return actions.find((a) => a.type === type);
  } else if (batchAction.type === type) {
    return batchAction;
  }

  return undefined;
}

export const getReduxUndoFilterFn =
  (excludeActions: string[]): FilterFunction =>
  <T>(
    action: AnyAction,
    currentState: T,
    previousHistory: StateWithHistory<T>
  ) => {
    return (
      !excludeActions.includes(action.type) &&
      currentState !== previousHistory.present
    );
  };

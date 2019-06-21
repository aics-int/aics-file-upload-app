import { expect } from "chai";
import { get } from "lodash";
import * as sinon from "sinon";

import { getAlert } from "../../feedback/selectors";
import { AlertType } from "../../feedback/types";
import { createMockReduxStore, mockReduxLogicDeps } from "../../test/configure-mock-store";
import { mockImagingSessions, mockState } from "../../test/mocks";
import { requestImagingSessions } from "../actions";
import { getImagingSessions } from "../selectors";

describe("Metadata logics", () => {
    describe("requestImagingSessions", () => {
        it("sets imaging session given OK response", (done) => {
            const getStub = sinon.stub().resolves({
                data: {
                    rows: mockImagingSessions,
                },
            });
            const reduxLogicDeps = {
                ...mockReduxLogicDeps,
                httpClient: {
                    ...mockReduxLogicDeps.httpClient,
                    get: getStub,
                },
            };
            const store = createMockReduxStore(mockState, reduxLogicDeps);

            // before
            expect(getImagingSessions(store.getState())).to.be.empty;

            // apply
            store.dispatch(requestImagingSessions());

            // after
            store.subscribe(() => {
                expect(getImagingSessions(store.getState())).to.not.be.empty;
                done();
            });
        });

        it("sets alert given non-OK response", (done) => {
            const getStub = sinon.stub().rejects();
            const reduxLogicDeps = {
                ...mockReduxLogicDeps,
                httpClient: {
                    ...mockReduxLogicDeps.httpClient,
                    get: getStub,
                },
            };
            const store = createMockReduxStore(mockState, reduxLogicDeps);

            // before
            expect(getAlert(store.getState())).to.be.undefined;

            // apply
            store.dispatch(requestImagingSessions());

            // after
            store.subscribe(() => {
                const alert = getAlert(store.getState());
                expect(alert).to.not.be.undefined;
                expect(get(alert, "type")).to.equal(AlertType.ERROR);
                expect(get(alert, "message")).to.equal("Could not retrieve imaging session metadata");
                done();
            });
        });
    });
});
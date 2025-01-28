import { expect } from "chai";

import { mockState } from "../../test/mocks";
import { getLimsUrl } from "../selectors";

describe("Settings selectors", () => {
  describe("getLimsUrl", () => {
    it("constructs lims url from settings", () => {
      const url = getLimsUrl(mockState);
      expect(url).to.equal("http://aics.corp.alleninstitute.org:80");
    });
  });
});

import * as actions from "../metadataExtraction/actions";
import logics from "../metadataExtraction/logics";
import reducer, {
  initialState as metadataExtractionInitialState,
} from "../metadataExtraction/reducer";
import * as selectors from "../metadataExtraction/selectors";

export default {
  actions,
  reducer,
  logics,
  selectors,
  metadataExtractionInitialState,
};

import { Unit } from "../metadata/types";
import { AppPage } from "../selection/types";
import { State } from "../types";

export const mockState: State = {
    feedback: {
        isLoading: false,
        requestsInProgress: new Set(),
    },
    metadata: {
        units: [],
    },
    selection: {
        files: [],
        page: AppPage.DragAndDrop,
        stagedFiles: [],
        wells: [],
    },
};

export const mockUnits: Unit[] = [
    {
        description: "",
        name: "unit1",
        type: "volume",
        unitsId: 1,
    },
    {
        description: "",
        name: "unit2",
        type: "volume",
        unitsId: 2,
    },
    {
        description: "",
        name: "unit3",
        type: "mass",
        unitsId: 3,
    },
    {
        description: "",
        name: "unit4",
        type: "mass",
        unitsId: 4,
    },
];

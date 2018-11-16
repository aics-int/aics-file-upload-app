import axios from "axios";

import { LABKEY_SELECT_ROWS_URL } from "../../constants";

export interface Plate {
    BarCode: string;
    PlateId: number;
}
interface GetBarcodesResponse {
    data: {
        rowCount: number,
        rows: Plate[],
    };
}

class Get {
    public static platesByBarcode(searchString: string): Promise<Plate[]> {
        const query = LABKEY_SELECT_ROWS_URL("microscopy", "Plate", [
            `query.barcode~contains=${searchString}`,
            "query.columns=barcode,plateid",
        ]);

        return axios.get(query)
            .then((response: GetBarcodesResponse) => {
                return response.data.rows;
            });
    }
}

export default {
    Get,
};

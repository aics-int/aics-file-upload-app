import { isEmpty, map } from "lodash";

import { DatabaseMetadata, Table } from "../../state/metadata/types";
import { BarcodePrefix, ImagingSession, LabkeyUnit, Unit } from "../../state/metadata/types";
import { Workflow } from "../../state/selection/types";
import { Annotation, AnnotationType } from "../../state/template/types";
import { LocalStorage } from "../../state/types";
import BaseServiceClient from "../base-service-client";
import {
    GetTablesResponse,
    GetTablesResponseColumn,
    GetTablesResponseQuery, LabkeyAnnotation, LabkeyAnnotationType,
    LabkeyImagingSession,
    LabkeyPlate,
    LabKeyPlateBarcodePrefix,
    LabkeyPlateResponse,
    LabkeyResponse,
    LabKeyWorkflow,
} from "./types";

const LABKEY_GET_TABLES_URL = `/AICS/query-getQueries.api`;
const LK_FILEMETADATA_SCHEMA = "filemetadata";
const LK_MICROSCOPY_SCHEMA = "microscopy";

// There are more schemas, but these are the only ones (AFAIK) that users use
const SCHEMAS = [
    "assayscustom",
    "celllines",
    LK_MICROSCOPY_SCHEMA,
    "processing",
];

export default class LabkeyClient extends BaseServiceClient {
    private static getSelectRowsURL = (schema: string, table: string, additionalQueries: string[] = []) => {
        const base = `/AICS/query-selectRows.api?schemaName=${schema}&query.queryName=${table}`;
        if (!isEmpty(additionalQueries)) {
            return `${base}&${additionalQueries.join("&")}`;
        }

        return base;
    }

    constructor(config: {host: string, localStorage: LocalStorage, port: string, protocol: string}) {
        super(config);
    }

    /**
     * Gets all annotation types
     */
    public async getAnnotationTypes(): Promise<AnnotationType[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_FILEMETADATA_SCHEMA, "AnnotationType");
        const { rows } = await this.httpClient.get(query);
        return rows.map(({
            AnnotationTypeId: annotationTypeId,
            Name: name,
        }: LabkeyAnnotationType) => ({
            annotationTypeId,
            name,
        }));
    }

    /**
     * Gets all annotations
     */
    public async getAnnotations(): Promise<Annotation[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_FILEMETADATA_SCHEMA, "Annotation");
        const { rows } = await this.httpClient.get(query);
        return rows.map(({
                                    AnnotationId: annotationId,
                                    AnnotationTypeId: annotationTypeId,
                                    Created: created,
                                    CreatedBy: createdBy,
                                    Description: description,
                                    Modified: modified,
                                    ModifiedBy: modifiedBy,
                                    Name: name,
        }: LabkeyAnnotation) => ({
            annotationId,
            annotationTypeId,
            created,
            createdBy,
            description,
            modified,
            modifiedBy,
            name,
        }));
    }

    /**
     * Searches plates where the barcode contains searchString
     * @param searchString fragment of a barcode
     */
    public async getPlatesByBarcode(searchString: string):
        Promise<LabkeyPlateResponse[]> {
        const query = LabkeyClient.getSelectRowsURL("microscopy", "Plate", [
            `query.barcode~contains=${searchString}`,
        ]);

        const response: LabkeyResponse<LabkeyPlate> = await this.httpClient.get(query);
        const plates: LabkeyPlate[] = response.rows;
        return map(plates, (p) => ({
            barcode: p.BarCode,
            imagingSessionId: p.ImagingSessionId,
        }));
    }

    /**
     * Retrieves all imagingSessions
     */
    public async getImagingSessions(): Promise<ImagingSession[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_MICROSCOPY_SCHEMA, "ImagingSession");
        const response = await this.httpClient.get(query);
        return response.rows.map((imagingSession: LabkeyImagingSession) => ({
            description: imagingSession.Description,
            imagingSessionId: imagingSession.ImagingSessionId,
            name: imagingSession.Name,
        }));
    }

    /**
     * Retrieves all barcodePrefixes
     */
    public async getBarcodePrefixes(): Promise<BarcodePrefix[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_MICROSCOPY_SCHEMA, "PlateBarcodePrefix");
        const response = await this.httpClient.get(query);
        return response.rows.map((barcodePrefix: LabKeyPlateBarcodePrefix) => ({
            description: `${barcodePrefix.Prefix} - ${barcodePrefix.TeamName}`,
            prefix: barcodePrefix.Prefix,
            prefixId: barcodePrefix.PlateBarcodePrefixId,
        }));
    }

    /**
     * Retrieves all units
     */
    public async getUnits(): Promise<Unit[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_MICROSCOPY_SCHEMA, "Units");
        const response = await this.httpClient.get(query);
        return response.rows.map((unit: LabkeyUnit) => ({
            description: unit.Description,
            name: unit.Name,
            type: unit.Type,
            unitsId: unit.UnitsId,
        }));
    }

    /**
     * Retrieves all Table names and Table Column names for each Schema defined in the constant SCHEMAS
     */
    public async getDatabaseMetadata(): Promise<DatabaseMetadata> {
        const requests = SCHEMAS.map((schemaName: string) =>
            this.httpClient.post(LABKEY_GET_TABLES_URL, { schemaName })
        );
        const responses: GetTablesResponse[] = await Promise.all(requests);
        let tables: Table[] = [];
        responses.forEach(({ schemaName, queries }: GetTablesResponse) => {
            tables = [
                ...tables,
                ...queries
                // User defined queries have been broken in production before, we want to avoid breaking the app
                // because of them -- also it doesn't seem like we want to let the user to associate with a view
                    .filter(({ isUserDefined }: GetTablesResponseQuery) => !isUserDefined)
                    .map(({ columns, name }: GetTablesResponseQuery) => ({
                        columns: columns.map((column: GetTablesResponseColumn) => column.caption),
                        displayName: name,
                        name,
                        schemaName,
                    })),
            ];
        });
        // If any duplicate table name are present append the schemaName as a suffix
        return tables.reduce((acc: DatabaseMetadata, table: Table) => {
            const matchingTable = tables.find(({ name, schemaName }: Table) => (
                table.name === name && table.schemaName !== schemaName)
            );
            if (matchingTable) {
                const displayName = `${table.name} (${table.schemaName})`;
                return {
                    ...acc,
                    [displayName]: {
                        ...table,
                        displayName,
                    },
                };
            }
            return {
                ...acc,
                [table.name]: table,
            };
        }, {});
    }

    public async getColumnValues(schemaName: string,
                                 queryName: string,
                                 columnName: string): Promise<string[]> {
        const query = LabkeyClient.getSelectRowsURL(schemaName, queryName, [`query.columns=${columnName}`]);
        const response = await this.httpClient.get(query);
        return response.rows.map((columnValue: any) => columnValue[columnName]);
    }

    /**
     * Retrieves all workflows
     */
    public async getWorkflows(): Promise<Workflow[]> {
        const query = LabkeyClient.getSelectRowsURL(LK_MICROSCOPY_SCHEMA, "Workflow");
        const response = await this.httpClient.get(query);
        return response.rows.map((workflow: LabKeyWorkflow) => ({
            description: workflow.Description,
            name: workflow.Name,
            workflowId: workflow.WorkflowId,
        }));
    }

    protected get baseURL(): string {
        return `${this.protocol}://${this.host}:${this.port}/labkey`;
    }
}

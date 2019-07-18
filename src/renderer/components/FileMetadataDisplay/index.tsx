import { Descriptions } from "antd";
import { decamelizeKeys } from "humps";
import { map } from "lodash";
import * as React from "react";

const Item = Descriptions.Item;

const SEPARATOR = { separator: " "};
interface MetadataDisplayProps {
    className?: string;
    title: string;
    metadata: any;
}
const FileMetadataDisplay: React.FunctionComponent<MetadataDisplayProps> =
    ({className, metadata, title}: MetadataDisplayProps) => {

    metadata = decamelizeKeys(metadata, SEPARATOR);
    title = `${title} Metadata`;
    return (
        <Descriptions
            className={className}
            size="small"
            title={title}
            column={{xs: 1}}
            bordered={false}
        >
            {map(metadata, (value: any, key: string) => {
                if (typeof value === "object") {
                    if (Array.isArray(value)) {
                        // todo handle arrays of objects
                        return <Item label={key} key={key}>{value.join(", ")}</Item>;
                    }
                    return <FileMetadataDisplay title={key} metadata={value} key={key}/>;
                }

                return <Item label={key} key={key}>{value}</Item>;
            })}
        </Descriptions>
    );
};

export default FileMetadataDisplay;

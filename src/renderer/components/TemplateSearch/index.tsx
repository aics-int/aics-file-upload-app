import { Divider, Icon, Select, Form, Alert } from "antd";
import classNames from "classnames";
import { sortBy } from "lodash";
import { ReactNode } from "react";
import * as React from "react";
import { useDispatch, useSelector } from "react-redux";

import { SCHEMA_SYNONYM } from "../../../shared/constants";
import { LabkeyTemplate } from "../../services/labkey-client/types";
import { getRequestsInProgress } from "../../state/feedback/selectors";
import { getTemplates } from "../../state/metadata/selectors";
import { openTemplateEditor } from "../../state/selection/actions";
import { AsyncRequest } from "../../state/types";

const styles = require("./styles.pcss");

interface TemplateSearchProps {
  allowCreate?: boolean;
  className?: string;
  defaultOpen?: boolean;
  disabled?: boolean;
  error?: boolean;
  onSelect: (selectedTemplateId: number) => void;
  value?: number;
}

export default function TemplateSearch(props: TemplateSearchProps) {
  const requestsInProgress = useSelector(getRequestsInProgress);
  const loading = requestsInProgress.includes(AsyncRequest.GET_TEMPLATES);
  const templates = useSelector(getTemplates);
  const dispatch = useDispatch();
  const [open, setOpen] = React.useState<boolean>(false);
  const [elClicked, setElClicked] = React.useState<EventTarget | undefined>(
    undefined
  );

  const {
    allowCreate,
    className,
    defaultOpen,
    disabled,
    error,
    onSelect,
    value,
  } = props;

  // Group templates by name prioritizing the newest version of a template
  let selectedTemplate: LabkeyTemplate | undefined;
  const templateNameToNewestVersion = templates.reduce(
    (templateNameToTemplate, template) => {
      if (template["TemplateId"] === value) {
        selectedTemplate = template;
      }

      const currentHighestTemplateForVersion =
        templateNameToTemplate[template["Name"]];
      if (
        !currentHighestTemplateForVersion ||
        currentHighestTemplateForVersion["Version"] < template["Version"]
      ) {
        templateNameToTemplate[template["Name"]] = template;
      }
      return templateNameToTemplate;
    },
    {} as { [name: string]: LabkeyTemplate }
  );
  const filteredTemplates = Object.values(templateNameToNewestVersion);

  // If the template selected is not the most recent version make the newest and current
  // distinguishable from each other
  let isOldVersionOfTemplate = false;
  const templateOptions = filteredTemplates.flatMap((template) => {
    if (
      selectedTemplate &&
      selectedTemplate["Name"] === template["Name"] &&
      selectedTemplate["TemplateId"] !== template["TemplateId"]
    ) {
      isOldVersionOfTemplate = true;
      return [
        { ...template, Name: `${template["Name"]} (newest version)` },
        { ...selectedTemplate, Name: `${template["Name"]} (old version)` },
      ];
    }
    return [template];
  });

  const sortedTemplates = sortBy(templateOptions, ["Name"]);
  return (
    <>
      <Form.Item className={styles.form} validateStatus={error ? "error" : ""}>
        <Select
          className={classNames(styles.container, className)}
          defaultOpen={defaultOpen}
          disabled={disabled || (loading && !templates)}
          dropdownRender={(menu: ReactNode | undefined) => (
            <div>
              {menu}
              {allowCreate && (
                <>
                  <Divider className={styles.divider} />
                  <div
                    className={styles.createTemplate}
                    /* this is not onClick because of a bug here https://github.com/ant-design/ant-design/issues/16209
                     * I am hoping that we can change this to onClick after we upgrade antd to the latest version in FUA-6
                     * */
                    onMouseDown={(e) =>
                      setElClicked(e.target === null ? undefined : e.target)
                    }
                    onMouseUp={(e) => {
                      if (elClicked === e.target) {
                        setOpen(false);
                        setElClicked(undefined);
                        dispatch(openTemplateEditor());
                      }
                    }}
                  >
                    <Icon className={styles.icon} type="plus-circle" />
                    <span className={styles.text}>Create {SCHEMA_SYNONYM}</span>
                  </div>
                </>
              )}
            </div>
          )}
          loading={loading && !templates}
          onDropdownVisibleChange={(visible: boolean) => {
            if (!elClicked) {
              setOpen(visible);
            }
          }}
          onSelect={(templateId: number) => {
            onSelect(templateId);
            setOpen(false);
          }}
          open={open}
          placeholder={`Select a ${SCHEMA_SYNONYM.toLowerCase()} name`}
          showSearch={true}
          value={value}
        >
          {sortedTemplates.map(
            ({ Name: name, TemplateId: id }: LabkeyTemplate) => (
              <Select.Option key={id} value={id}>
                {name}
              </Select.Option>
            )
          )}
        </Select>
      </Form.Item>
      {isOldVersionOfTemplate && (
        <Alert
          showIcon
          type="warning"
          message="Newer version of template available"
        />
      )}
    </>
  );
}

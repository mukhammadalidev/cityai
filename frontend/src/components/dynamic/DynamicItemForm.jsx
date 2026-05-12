import { Checkbox, Form, Input, InputNumber, Select, Switch } from "antd";
import { getMetadataFields } from "../../config/fieldConfigs";

function renderControl(field) {
  switch (field.type) {
    case "bool":
      return <Checkbox />;
    case "switch":
      return <Switch />;
    case "number":
      return <InputNumber style={{ width: "100%" }} />;
    case "select":
      return (
        <Select
          allowClear
          options={(field.options || []).map((o) =>
            typeof o === "string" ? { value: o, label: o } : o,
          )}
        />
      );
    default:
      return <Input />;
  }
}

function valuePropName(type) {
  if (type === "bool") return "checked";
  if (type === "switch") return "checked";
  return undefined;
}

export default function DynamicItemForm({ businessType }) {
  const fields = getMetadataFields(businessType);

  return (
    <>
      {fields.map((f) => (
        <Form.Item
          key={f.name}
          name={["metadata", f.name]}
          label={f.label}
          valuePropName={valuePropName(f.type)}
        >
          {renderControl(f)}
        </Form.Item>
      ))}
    </>
  );
}

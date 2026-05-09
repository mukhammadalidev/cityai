import { Checkbox, Form, Input, InputNumber, Space } from "antd";
import { getMetadataFields } from "../../config/fieldConfigs";

export default function DynamicItemForm({ businessType }) {
  const fields = getMetadataFields(businessType);

  return (
    <>
      {fields.map((f) => (
        <Form.Item key={f.name} name={["metadata", f.name]} label={f.label} valuePropName={f.type === "bool" ? "checked" : undefined}>
          {f.type === "bool" ? <Checkbox /> : f.type === "number" ? <InputNumber style={{ width: "100%" }} /> : <Input />}
        </Form.Item>
      ))}
    </>
  );
}

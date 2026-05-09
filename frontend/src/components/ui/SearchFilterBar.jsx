import { Input, Space } from "antd";
import { SearchOutlined } from "@ant-design/icons";

export default function SearchFilterBar({ placeholder, value, onChange, extra }) {
  return (
    <Space wrap style={{ marginBottom: 16, width: "100%" }}>
      <Input
        allowClear
        prefix={<SearchOutlined />}
        placeholder={placeholder || "Qidirish..."}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        style={{ maxWidth: 320 }}
      />
      {extra}
    </Space>
  );
}

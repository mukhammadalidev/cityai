import { Table } from "antd";

export default function DataTable({ className = "cs-table-wrap", ...props }) {
  return <Table className={className} scroll={{ x: "max-content" }} {...props} />;
}

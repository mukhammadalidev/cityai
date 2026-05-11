import { Table } from "antd";

/** Ant Table + kichik ekranda gorizontal scroll (scroll berilsa, x max-content default bilan birlashtiriladi). */
export default function DataTable({ className = "cs-table-wrap", scroll, ...props }) {
  const mergedScroll = { x: "max-content", ...(scroll || {}) };
  return <Table className={className} scroll={mergedScroll} {...props} />;
}

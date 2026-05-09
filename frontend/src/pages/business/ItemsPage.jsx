import { Button, Col, Row, Select, Space, Table, message } from "antd";
import { AppstoreOutlined, PlusOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import SearchFilterBar from "../../components/ui/SearchFilterBar";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import { confirmDelete } from "../../components/ui/ConfirmDelete";
import DynamicItemCard from "../../components/dynamic/DynamicItemCard";
import { getItems, deleteItem } from "../../services/itemService";
import { ITEM_STATUS } from "../../config/statusConfigs";
import { getBusinessTypeConfig } from "../../config/businessTypes";
import StatusTag from "../../components/ui/StatusTag";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";

export default function ItemsPage() {
  const { businessId, business } = useOutletContext();
  const nav = useNavigate();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("cards");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const params = { business_id: businessId, search: search || undefined };
      if (business?.business_type === "education_center") params.education_catalog_kind = "course";
      const list = await getItems(params);
      setRows(status ? list.filter((i) => i.status === status) : list);
    } catch {
      message.error("Pozitsiyalar yuklanmadi. Internet va API manzilini tekshiring.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, business?.business_type, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent("business-changed", load);
  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  const bt = business?.business_type;
  const cfg = getBusinessTypeConfig(bt);
  const itemsLabel = cfg.itemsLabel || "Pozitsiyalar";
  const itemLabel = cfg.itemLabel || "Pozitsiya";

  if (!businessId) return null;
  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title={business?.name ? `${business.name} — ${itemsLabel}` : itemsLabel}
        description={
          bt === "restaurant"
            ? "Restoran menyusi."
            : bt === "education_center"
              ? "Faqat kurslar. Kitob va mahsulotlar «Materiallar» bo‘limida."
              : "Katalogdagi mahsulot va xizmatlar."
        }
        extra={
          <Space>
            <Button icon={view === "cards" ? <UnorderedListOutlined /> : <AppstoreOutlined />} onClick={() => setView(view === "cards" ? "table" : "cards")}>
              {view === "cards" ? "Jadval" : "Kartalar"}
            </Button>
            <Link to="/business/items/new">
              <Button type="primary" icon={<PlusOutlined />}>
                Qo‘shish
              </Button>
            </Link>
          </Space>
        }
      />
      <SearchFilterBar
        placeholder="Qidiruv"
        value={search}
        onChange={setSearch}
        extra={
          <Select
            allowClear
            placeholder="Holat"
            style={{ width: 160 }}
            value={status}
            onChange={setStatus}
            options={Object.keys(ITEM_STATUS).map((k) => ({ value: k, label: ITEM_STATUS[k].label }))}
          />
        }
      />
      {!rows.length ? (
        <EmptyState description={`${itemsLabel} hozircha yo‘q.`} />
      ) : view === "cards" ? (
        <Row gutter={[16, 16]}>
          {rows.map((item) => (
            <Col xs={24} sm={12} lg={8} key={item.id}>
              <DynamicItemCard item={item} businessType={bt} onClick={() => nav(`/business/items/${item.id}`)} />
              <Space style={{ marginTop: 8 }}>
                <Link to={`/business/items/${item.id}/edit`}>
                  <Button size="small">Tahrirlash</Button>
                </Link>
                <Button
                  size="small"
                  danger
                  onClick={() =>
                    confirmDelete({
                      title: "O‘chirilsinmi?",
                      onOk: async () => {
                        await deleteItem(item.id);
                        message.success("O‘chirildi.");
                        load();
                        notifyBusinessDataChanged();
                      },
                    })
                  }
                >
                  O‘chirish
                </Button>
              </Space>
            </Col>
          ))}
        </Row>
      ) : (
        <Table
          rowKey="id"
          dataSource={rows}
          pagination={{ pageSize: 12 }}
          columns={[
            { title: itemLabel, dataIndex: "title" },
            { title: "Narx", dataIndex: "price" },
            {
              title: "Holat",
              dataIndex: "status",
              render: (v) => <StatusTag map={ITEM_STATUS} value={v} />,
            },
            {
              title: "",
              render: (_, r) => (
                <Space>
                  <Button size="small" onClick={() => nav(`/business/items/${r.id}`)}>
                    Ko‘rish
                  </Button>
                  <Link to={`/business/items/${r.id}/edit`}>
                    <Button size="small">Tahrirlash</Button>
                  </Link>
                </Space>
              ),
            },
          ]}
        />
      )}
    </>
  );
}

import { Button, Col, Row, Segmented, Select, Skeleton, Space, Table, message } from "antd";
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
import { formatPrice } from "../../utils/formatters";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";

const ITEM_DESCRIPTIONS = {
  restaurant: "Restoran menyusi — taomlar, narxlar va mavjudlik.",
  education_center: "Kurslar katalogi. Kitob va mahsulotlar «Materiallar» bo'limida.",
  auto_salon: "Avtosalon vitrinasi — mashinalar va xususiyatlar.",
  fitness_center: "Abonementlar va mashg'ulot paketlari.",
  shop: "Do'kon mahsulotlari va narxlar.",
};

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
  const desc = ITEM_DESCRIPTIONS[bt] || "Katalogdagi mahsulot va xizmatlar.";

  if (!businessId) return null;
  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        eyebrow={cfg.label}
        title={itemsLabel}
        description={desc}
        accent={cfg.color}
        extra={
          <Link to="/business/items/new">
            <Button type="primary" size="large" icon={<PlusOutlined />}>
              {itemLabel} qo&apos;shish
            </Button>
          </Link>
        }
      />

      <div className="cs-page-toolbar">
        <SearchFilterBar
          embedded
          placeholder={`${itemLabel} qidirish…`}
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
        <div className="cs-view-toggle">
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { label: "Kartalar", value: "cards", icon: <AppstoreOutlined /> },
              { label: "Jadval", value: "table", icon: <UnorderedListOutlined /> },
            ]}
          />
        </div>
      </div>

      {loading ? (
        <Row gutter={[16, 16]}>
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Col xs={24} sm={12} lg={8} key={i}>
              <Skeleton active paragraph={{ rows: 4 }} />
            </Col>
          ))}
        </Row>
      ) : !rows.length ? (
        <EmptyState
          description={`${itemsLabel} hozircha yo'q.`}
          action={
            <Link to="/business/items/new">
              <Button type="primary">Birinchi {itemLabel.toLowerCase()}ni qo&apos;shish</Button>
            </Link>
          }
        />
      ) : view === "cards" ? (
        <Row gutter={[16, 16]}>
          {rows.map((item) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={item.id}>
              <div className="cs-item-grid-card">
                <DynamicItemCard item={item} businessType={bt} onClick={() => nav(`/business/items/${item.id}`)} />
                <div className="cs-item-grid-card__actions">
                  <Link to={`/business/items/${item.id}/edit`}>
                    <Button size="small">Tahrirlash</Button>
                  </Link>
                  <Button size="small" onClick={() => nav(`/business/items/${item.id}`)}>
                    Batafsil
                  </Button>
                  <Button
                    size="small"
                    danger
                    onClick={() =>
                      confirmDelete({
                        title: "O'chirilsinmi?",
                        onOk: async () => {
                          await deleteItem(item.id);
                          message.success("O'chirildi.");
                          load();
                          notifyBusinessDataChanged();
                        },
                      })
                    }
                  >
                    O&apos;chirish
                  </Button>
                </div>
              </div>
            </Col>
          ))}
        </Row>
      ) : (
        <div className="cs-table-scroll">
          <Table
            className="cs-premium-table"
            rowKey="id"
            dataSource={rows}
            pagination={{ pageSize: 12, showSizeChanger: false }}
            scroll={{ x: 720 }}
            columns={[
              { title: itemLabel, dataIndex: "title", ellipsis: true },
              {
                title: "Narx",
                dataIndex: "price",
                width: 140,
                render: (v, r) => formatPrice(v, r.currency),
              },
              {
                title: "Holat",
                dataIndex: "status",
                width: 120,
                render: (v) => <StatusTag map={ITEM_STATUS} value={v} />,
              },
              {
                title: "",
                width: 200,
                fixed: "right",
                render: (_, r) => (
                  <Space wrap>
                    <Button size="small" onClick={() => nav(`/business/items/${r.id}`)}>
                      Ko&apos;rish
                    </Button>
                    <Link to={`/business/items/${r.id}/edit`}>
                      <Button size="small">Tahrirlash</Button>
                    </Link>
                  </Space>
                ),
              },
            ]}
          />
        </div>
      )}
    </>
  );
}

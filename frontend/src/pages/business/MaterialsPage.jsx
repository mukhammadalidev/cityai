import { Button, Col, Row, Select, Space, Table, message } from "antd";
import { AppstoreOutlined, PlusOutlined, UnorderedListOutlined } from "@ant-design/icons";
import { useCallback, useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import SearchFilterBar from "../../components/ui/SearchFilterBar";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import UpgradeCard from "../../components/ui/UpgradeCard";
import { confirmDelete } from "../../components/ui/ConfirmDelete";
import DynamicItemCard from "../../components/dynamic/DynamicItemCard";
import { getItems, deleteItem } from "../../services/itemService";
import { ITEM_STATUS } from "../../config/statusConfigs";
import StatusTag from "../../components/ui/StatusTag";
import { useWindowEvent } from "../../hooks/useWindowEvent";
import { BUSINESS_DATA_CHANGED, notifyBusinessDataChanged } from "../../utils/businessEvents";

const KIND_UZ = { book: "Kitob", product: "Mahsulot" };

export default function MaterialsPage() {
  const { businessId, business, plan } = useOutletContext();
  const nav = useNavigate();
  const isEdu = business?.business_type === "education_center";
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("cards");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState();

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
      const list = await getItems({
        business_id: businessId,
        education_catalog_kind: "materials",
        search: search || undefined,
      });
      setRows(status ? list.filter((i) => i.status === status) : list);
    } catch {
      message.error("Materiallar yuklanmadi.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [businessId, search, status]);

  useEffect(() => {
    load();
  }, [load]);

  useWindowEvent("business-changed", load);
  useWindowEvent(BUSINESS_DATA_CHANGED, load);

  if (!isEdu) {
    return <Navigate to="/business/dashboard" replace />;
  }
  if (!businessId) return null;
  if (!plan?.has_edu_materials) {
    return (
      <>
        <PageHeader title="Materiallar" description="Kitob va mahsulotlar katalogi." />
        <UpgradeCard
          title="Bu funksiya tarifda yo‘q"
          description="Start va yuqori tariflarda materiallar moduli ochiladi. Billing sahifasidan obunani yangilang."
        />
        <Link to="/business/billing">
          <Button type="primary" style={{ marginTop: 16 }}>
            Tariflarni ko‘rish
          </Button>
        </Link>
      </>
    );
  }
  if (loading && !rows.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader
        title={business?.name ? `${business.name} — Materiallar` : "Materiallar"}
        description="Kitoblar va boshqa mahsulotlar (kurslardan alohida katalog)."
        extra={
          <Space>
            <Button
              icon={view === "cards" ? <UnorderedListOutlined /> : <AppstoreOutlined />}
              onClick={() => setView(view === "cards" ? "table" : "cards")}
            >
              {view === "cards" ? "Jadval" : "Kartalar"}
            </Button>
            <Link to="/business/materials/new">
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
        <EmptyState description="Materiallar hozircha yo‘q." />
      ) : view === "cards" ? (
        <Row gutter={[16, 16]}>
          {rows.map((item) => (
            <Col xs={24} sm={12} lg={8} key={item.id}>
              <DynamicItemCard item={item} businessType={business?.business_type} onClick={() => nav(`/business/items/${item.id}`)} />
              <Space style={{ marginTop: 8 }}>
                <Link to={`/business/materials/${item.id}/edit`}>
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
            { title: "Nomi", dataIndex: "title" },
            {
              title: "Tur",
              dataIndex: "education_catalog_kind",
              width: 140,
              render: (k) => KIND_UZ[k] || k,
            },
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
                  <Link to={`/business/materials/${r.id}/edit`}>
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

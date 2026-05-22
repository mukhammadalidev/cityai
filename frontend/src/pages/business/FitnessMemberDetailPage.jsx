import { Card, Descriptions, Table, Tabs } from "antd";
import { useEffect, useState } from "react";
import { Link, Navigate, useOutletContext, useParams } from "react-router-dom";
import LoadingScreen from "../../components/ui/LoadingScreen";
import PageHeader from "../../components/ui/PageHeader";
import { getMemberLedger } from "../../services/fitnessService";
import { formatDate, formatPhone, formatPrice } from "../../utils/formatters";

export default function FitnessMemberDetailPage() {
  const { id } = useParams();
  const { business } = useOutletContext();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMemberLedger(id)
      .then(setData)
      .finally(() => setLoading(false));
  }, [id]);

  if (business?.business_type !== "fitness_center") return <Navigate to="/business/dashboard" replace />;
  if (loading) return <LoadingScreen />;
  if (!data?.client) return <Card>A'zo topilmadi</Card>;

  const c = data.client;

  return (
    <div>
      <PageHeader
        title={c.full_name}
        subtitle={formatPhone(c.phone)}
        extra={<Link to="/business/fitness/clients">← Ro'yxat</Link>}
      />
      <Card>
        <Descriptions column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="Holat">{c.status}</Descriptions.Item>
          <Descriptions.Item label="Jins">{c.gender}</Descriptions.Item>
          <Descriptions.Item label="Tug'ilgan">{formatDate(c.birth_date)}</Descriptions.Item>
          <Descriptions.Item label="Qo'shilgan">{formatDate(c.joined_date)}</Descriptions.Item>
          <Descriptions.Item label="Favqulodda">{c.emergency_contact || "—"}</Descriptions.Item>
          <Descriptions.Item label="Qarz">{formatPrice(c.total_debt)}</Descriptions.Item>
        </Descriptions>
      </Card>
      <Tabs
        style={{ marginTop: 16 }}
        items={[
          {
            key: "subs",
            label: "Abonementlar",
            children: (
              <Table
                rowKey="id"
                dataSource={data.memberships || []}
                pagination={false}
                columns={[
                  { title: "Reja", dataIndex: "plan_name" },
                  { title: "Tugash", dataIndex: "end_date" },
                  { title: "Qarz", render: (_, r) => formatPrice(r.debt_amount) },
                  { title: "Holat", dataIndex: "status" },
                ]}
              />
            ),
          },
          {
            key: "pay",
            label: "To'lovlar",
            children: (
              <Table
                rowKey="id"
                dataSource={data.payments || []}
                pagination={false}
                columns={[
                  { title: "Sana", dataIndex: "payment_date" },
                  { title: "Summa", render: (_, r) => formatPrice(r.amount) },
                  { title: "Usul", dataIndex: "method" },
                ]}
              />
            ),
          },
          {
            key: "att",
            label: "Davomat",
            children: (
              <Table
                rowKey="id"
                dataSource={data.attendances || []}
                pagination={false}
                columns={[
                  { title: "Sana", dataIndex: "visit_date" },
                  { title: "Check-in", dataIndex: "check_in_time" },
                  { title: "Check-out", dataIndex: "check_out_time" },
                  { title: "Holat", dataIndex: "status" },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  );
}

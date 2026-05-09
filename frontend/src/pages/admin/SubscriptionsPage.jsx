import { Button, Card, Col, Form, Modal, Row, Select, Space, Table, message } from "antd";
import { useCallback, useEffect, useState } from "react";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import EmptyState from "../../components/ui/EmptyState";
import PricingCard from "../../components/ui/PricingCard";
import StatusTag from "../../components/ui/StatusTag";
import { SUBSCRIPTION_STATUS } from "../../config/statusConfigs";
import { formatDate } from "../../utils/formatters";
import { getPlans, getSubscriptions, upgradeSubscription } from "../../services/subscriptionService";
import { getBusinesses } from "../../services/businessService";

export default function SubscriptionsPage() {
  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [biz, setBiz] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterPlan, setFilterPlan] = useState();
  const [filterStatus, setFilterStatus] = useState();
  const [modal, setModal] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s, b] = await Promise.all([getPlans(), getSubscriptions({}), getBusinesses({})]);
      setPlans(p);
      setSubs(s);
      setBiz(b);
    } catch {
      message.error("Ma’lumot yuklanmadi.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = subs.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false;
    if (filterPlan) {
      const pl = plans.find((x) => x.id === r.plan);
      if (pl?.code !== filterPlan) return false;
    }
    return true;
  });

  const openUpgrade = () => {
    form.resetFields();
    setModal(true);
  };

  const submitUpgrade = async () => {
    const v = await form.validateFields();
    try {
      await upgradeSubscription({ business_id: v.business_id, plan_code: v.plan_code });
      message.success("Obuna yangilandi.");
      setModal(false);
      load();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  if (loading && !plans.length) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Obunalar" description="Tariflar va biznes obunalari." extra={<Button onClick={openUpgrade}>Tarifni o‘zgartirish</Button>} />
      <Row gutter={[16, 16]}>
        {plans.map((p) => (
          <Col xs={24} md={12} xl={6} key={p.id}>
            <PricingCard plan={p} />
          </Col>
        ))}
      </Row>
      <Space style={{ margin: "24px 0 16px" }} wrap>
        <Select
          allowClear
          placeholder="Reja"
          style={{ width: 200 }}
          value={filterPlan}
          onChange={setFilterPlan}
          options={plans.map((p) => ({ value: p.code, label: p.name }))}
        />
        <Select
          allowClear
          placeholder="Holat"
          style={{ width: 180 }}
          value={filterStatus}
          onChange={setFilterStatus}
          options={Object.keys(SUBSCRIPTION_STATUS).map((k) => ({ value: k, label: SUBSCRIPTION_STATUS[k].label }))}
        />
      </Space>
      {!filtered.length ? (
        <EmptyState description="Obuna yozuvlari topilmadi." />
      ) : (
        <Table
          rowKey="id"
          dataSource={filtered}
          pagination={{ pageSize: 12 }}
          columns={[
            { title: "Biznes ID", dataIndex: "business" },
            { title: "Reja", dataIndex: "plan_name" },
            {
              title: "Holat",
              dataIndex: "status",
              render: (v) => <StatusTag map={SUBSCRIPTION_STATUS} value={v} />,
            },
            { title: "Boshlanish", dataIndex: "start_date", render: formatDate },
            { title: "Tugash", dataIndex: "end_date", render: formatDate },
            { title: "Keyingi to‘lov", dataIndex: "next_payment_date", render: formatDate },
          ]}
        />
      )}
      <Modal title="Obunani yangilash" open={modal} onCancel={() => setModal(false)} onOk={submitUpgrade} okText="Saqlash" cancelText="Bekor" destroyOnClose>
        <Form form={form} layout="vertical">
          <Form.Item name="business_id" label="Biznes" rules={[{ required: true }]}>
            <Select
              showSearch
              optionFilterProp="label"
              options={biz.map((b) => ({ value: b.id, label: `${b.name} (#${b.id})` }))}
            />
          </Form.Item>
          <Form.Item name="plan_code" label="Yangi tarif" rules={[{ required: true }]}>
            <Select options={plans.map((p) => ({ value: p.code, label: p.name }))} />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

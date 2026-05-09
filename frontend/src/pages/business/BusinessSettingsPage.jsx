import { Button, Form, Input, Upload, message } from "antd";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import { getBusiness, updateBusiness, patchBusinessFormData } from "../../services/businessService";
import { notifyBusinessDataChanged } from "../../utils/businessEvents";

export default function BusinessSettingsPage() {
  const { businessId, reloadBusinesses } = useOutletContext();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [logoList, setLogoList] = useState([]);
  const [coverList, setCoverList] = useState([]);

  useEffect(() => {
    if (!businessId) return;
    (async () => {
      setLoading(true);
      try {
        const b = await getBusiness(businessId);
        form.setFieldsValue({
          name: b.name,
          description: b.description,
          phone: b.phone,
          address: b.address,
          location_url: b.location_url,
          working_hours: b.working_hours,
          telegram_admin_chat_id: b.telegram_admin_chat_id,
        });
      } catch {
        message.error("Yuklanmadi.");
      } finally {
        setLoading(false);
      }
    })();
  }, [businessId, form]);

  const onFinish = async (values) => {
    const logo = logoList[0]?.originFileObj;
    const cover = coverList[0]?.originFileObj;
    try {
      if (logo || cover) {
        const fd = new FormData();
        Object.entries(values).forEach(([k, v]) => {
          if (v != null && v !== "") fd.append(k, String(v));
        });
        if (logo) fd.append("logo", logo);
        if (cover) fd.append("cover_image", cover);
        await patchBusinessFormData(businessId, fd);
      } else {
        await updateBusiness(businessId, values);
      }
      message.success("Saqlandi.");
      reloadBusinesses?.();
      window.dispatchEvent(new Event("business-changed"));
      notifyBusinessDataChanged();
    } catch (e) {
      message.error(e.response?.data?.detail || "Xatolik.");
    }
  };

  if (!businessId) return null;
  if (loading) return <LoadingScreen />;

  return (
    <>
      <PageHeader title="Biznes sozlamalari" description="Profil, aloqa va media." />
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 560 }}>
        <Form.Item name="name" label="Biznes nomi" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Logo">
          <Upload beforeUpload={() => false} maxCount={1} fileList={logoList} onChange={({ fileList: fl }) => setLogoList(fl)}>
            <Button>Fayl tanlash</Button>
          </Upload>
        </Form.Item>
        <Form.Item label="Muqova">
          <Upload beforeUpload={() => false} maxCount={1} fileList={coverList} onChange={({ fileList: fl }) => setCoverList(fl)}>
            <Button>Fayl tanlash</Button>
          </Upload>
        </Form.Item>
        <Form.Item name="description" label="Tavsif">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item name="phone" label="Telefon">
          <Input />
        </Form.Item>
        <Form.Item name="address" label="Manzil">
          <Input />
        </Form.Item>
        <Form.Item name="location_url" label="Xarita havolasi">
          <Input />
        </Form.Item>
        <Form.Item name="working_hours" label="Ish vaqti">
          <Input placeholder="09:00–18:00" />
        </Form.Item>
        <Form.Item name="telegram_admin_chat_id" label="Telegram admin chat ID">
          <Input />
        </Form.Item>
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Saqlash
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}

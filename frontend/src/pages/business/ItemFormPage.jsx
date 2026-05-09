import { Button, Form, Input, InputNumber, Select, Upload, message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useOutletContext, useParams } from "react-router-dom";
import PageHeader from "../../components/ui/PageHeader";
import LoadingScreen from "../../components/ui/LoadingScreen";
import DynamicItemForm from "../../components/dynamic/DynamicItemForm";
import { createItem, getItem, updateItem, postItemFormData, patchItemFormData } from "../../services/itemService";
import { ITEM_STATUS } from "../../config/statusConfigs";
import { notifyBusinessDataChanged } from "../../utils/businessEvents";

const EDU_KIND_OPTIONS_FULL = [
  { value: "course", label: "Kurs" },
  { value: "book", label: "Kitob" },
  { value: "product", label: "Boshqa mahsulot" },
];

export default function ItemFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const location = useLocation();
  const isMaterialsPath = location.pathname.startsWith("/business/materials");
  const nav = useNavigate();
  const { businessId, business } = useOutletContext();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(isEdit);
  const [fileList, setFileList] = useState([]);

  const isEdu = business?.business_type === "education_center";

  const kindSelectOptions = useMemo(() => {
    if (!isEdu) return [];
    if (isEdit) return EDU_KIND_OPTIONS_FULL;
    if (isMaterialsPath) return EDU_KIND_OPTIONS_FULL.filter((o) => o.value === "book" || o.value === "product");
    return EDU_KIND_OPTIONS_FULL.filter((o) => o.value === "course");
  }, [isEdu, isEdit, isMaterialsPath]);

  const eduKindWatch = Form.useWatch("education_catalog_kind", form);
  const dynamicBusinessType = useMemo(() => {
    if (!business?.business_type) return business?.business_type;
    if (business.business_type !== "education_center") return business.business_type;
    if (eduKindWatch === "book" || eduKindWatch === "product") return "shop";
    return "education_center";
  }, [business?.business_type, eduKindWatch]);

  useEffect(() => {
    if (!isEdit) {
      form.resetFields();
      const defaults = { currency: "UZS", status: "active", metadata: {} };
      if (isEdu) {
        defaults.education_catalog_kind = isMaterialsPath ? "book" : "course";
      }
      form.setFieldsValue(defaults);
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const item = await getItem(id);
        form.setFieldsValue({
          ...item,
          metadata: item.metadata || {},
        });
      } catch {
        message.error("Yuklanmadi.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id, isEdit, form, isEdu, isMaterialsPath]);

  const onFinish = async (values) => {
    if (!businessId) return;
    const payload = {
      business: businessId,
      title: values.title,
      category_name: values.category_name,
      price: values.price,
      currency: values.currency || "UZS",
      old_price: values.old_price,
      description: values.description,
      status: values.status,
      metadata: values.metadata || {},
    };
    if (isEdu) {
      payload.education_catalog_kind = values.education_catalog_kind || (isMaterialsPath ? "book" : "course");
    }
    const file = fileList[0]?.originFileObj;
    const backPath = isMaterialsPath ? "/business/materials" : "/business/items";
    try {
      if (file) {
        const fd = new FormData();
        Object.entries(payload).forEach(([k, v]) => {
          if (k === "metadata") fd.append(k, JSON.stringify(v ?? {}));
          else if (v !== undefined && v !== null) fd.append(k, String(v));
        });
        fd.append("image", file);
        if (isEdit) await patchItemFormData(id, fd);
        else await postItemFormData(fd);
      } else if (isEdit) await updateItem(id, payload);
      else await createItem(payload);
      message.success("Saqlandi.");
      notifyBusinessDataChanged();
      nav(backPath);
    } catch (e) {
      message.error(e.response?.data?.detail || JSON.stringify(e.response?.data) || "Xatolik.");
    }
  };

  if (!businessId) return null;
  if (loading) return <LoadingScreen />;

  const headerTitle = isMaterialsPath
    ? isEdit
      ? "Materialni tahrirlash"
      : "Yangi material (kitob / mahsulot)"
    : isEdit
      ? "Pozitsiyani tahrirlash"
      : "Yangi pozitsiya";

  return (
    <>
      <PageHeader
        title={headerTitle}
        description={
          isMaterialsPath
            ? "Kitob yoki boshqa mahsulot. Kurslar «Kurslar» bo‘limida."
            : isEdu
              ? "Kurs kartochkasi. Materiallar alohida bo‘limda."
              : "Asosiy maydonlar va turga xos ma’lumotlar."
        }
      />
      <Form form={form} layout="vertical" onFinish={onFinish} style={{ maxWidth: 640 }}>
        <Form.Item name="title" label="Sarlavha" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        {kindSelectOptions.length ? (
          <Form.Item name="education_catalog_kind" label="Tur" rules={[{ required: true }]}>
            <Select options={kindSelectOptions} />
          </Form.Item>
        ) : null}
        <Form.Item name="category_name" label="Kategoriya nomi">
          <Input />
        </Form.Item>
        <Form.Item name="price" label="Narx" rules={[{ required: true }]}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="currency" label="Valyuta">
          <Input />
        </Form.Item>
        <Form.Item name="old_price" label="Eski narx">
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item name="description" label="Tavsif">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item label="Rasm (ixtiyoriy)">
          <Upload
            beforeUpload={() => false}
            maxCount={1}
            fileList={fileList}
            onChange={({ fileList: fl }) => setFileList(fl)}
          >
            <Button>Fayl tanlash</Button>
          </Upload>
        </Form.Item>
        <Form.Item name="status" label="Holat" rules={[{ required: true }]}>
          <Select options={Object.keys(ITEM_STATUS).map((k) => ({ value: k, label: ITEM_STATUS[k].label }))} />
        </Form.Item>
        <DynamicItemForm businessType={dynamicBusinessType} />
        <Form.Item>
          <Button type="primary" htmlType="submit">
            Saqlash
          </Button>
        </Form.Item>
      </Form>
    </>
  );
}

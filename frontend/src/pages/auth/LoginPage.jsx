import { Alert, Button, Card, Form, Input, Typography, message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchMe, loginWithMe } from "../../services/authService";
import BrandLogo from "../../components/ui/BrandLogo";
import { getDashboardPathForRole } from "../../utils/authRouting";
import { clearSession, getAccessToken, getStoredUser, setSelectedBusinessId } from "../../utils/storage";

export default function LoginPage() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    const u = getStoredUser();
    const go = (role) => {
      if (role === "edu_teacher" || role === "edu_student" || role === "edu_parent") {
        setSelectedBusinessId(null);
      }
      nav(getDashboardPathForRole(role), { replace: true });
    };
    if (u?.role) {
      go(u.role);
      return;
    }
    fetchMe()
      .then((me) => go(me?.role))
      .catch(() => clearSession());
  }, [nav]);

  const onFinish = async (v) => {
    setLoading(true);
    try {
      const data = await loginWithMe(v.username, v.password);
      message.success("Muvaffaqiyatli kirdingiz");
      const role = data.user?.role || getStoredUser()?.role;
      if (role === "edu_teacher" || role === "edu_student" || role === "edu_parent") {
        setSelectedBusinessId(null);
      }
      nav(getDashboardPathForRole(role));
    } catch {
      message.error("Login yoki parol noto‘g‘ri yoki server ishlamayapti.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="cs-auth-card" bordered={false}>
      <div style={{ marginBottom: 12 }}>
        <BrandLogo height={64} />
      </div>
      <div className="cs-auth-brand">City Services AI Platform</div>
      <div className="cs-auth-tag">Shahar xizmatlari — bitta platformada. Login va parolingizni kiriting.</div>
      <Form layout="vertical" onFinish={onFinish}>
        <Form.Item name="username" label="Login" rules={[{ required: true, message: "Login kiriting" }]}>
          <Input size="large" autoComplete="username" />
        </Form.Item>
        <Form.Item name="password" label="Parol" rules={[{ required: true, message: "Parol kiriting" }]}>
          <Input.Password size="large" autoComplete="current-password" />
        </Form.Item>
        <Button type="primary" htmlType="submit" block size="large" loading={loading} style={{ height: 46 }}>
          Kirish
        </Button>
      </Form>
      <Alert
        className="cs-login-demo-alert"
        style={{ marginTop: 16 }}
        type="info"
        showIcon
        message="Demo: admin / admin12345; biznes0 / demo12345; ta'lim uchun ustoz_demo va oquvchi_demo / demo12345 (seed_demo dan keyin). Boshqa ustoz/o‘quvchi/ota-onani markaz kabinetidan yaratish mumkin."
      />
    </Card>
  );
}

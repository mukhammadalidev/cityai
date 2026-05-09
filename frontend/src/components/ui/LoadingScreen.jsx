import { Spin } from "antd";

export default function LoadingScreen({ tip = "Yuklanmoqda..." }) {
  return (
    <div style={{ display: "grid", placeItems: "center", minHeight: 320 }}>
      <Spin size="large" tip={tip} />
    </div>
  );
}

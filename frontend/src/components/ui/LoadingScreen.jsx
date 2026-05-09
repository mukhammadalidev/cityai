import { Spin } from "antd";

export default function LoadingScreen({ tip = "Yuklanmoqda..." }) {
  return (
    <div className="cs-loading-screen">
      <Spin size="large" tip={tip} />
    </div>
  );
}

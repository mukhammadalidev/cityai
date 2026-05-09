import { Button, Result } from "antd";
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>
      <Result
        status="404"
        title="404"
        subTitle="Sahifa topilmadi."
        extra={
          <Link to="/c/buxoro">
            <Button type="primary">Bosh sahifaga</Button>
          </Link>
        }
      />
    </div>
  );
}

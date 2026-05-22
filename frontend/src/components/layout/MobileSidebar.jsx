import { Drawer } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import BrandLogo from "../ui/BrandLogo";

export default function MobileSidebar({ open, onClose, title, subtitle, children }) {
  return (
    <Drawer
      placement="left"
      onClose={onClose}
      open={open}
      width="min(100vw - 32px, 320px)"
      className="cs-mobile-sidebar"
      rootClassName="cs-mobile-sidebar-root"
      title={null}
      closable={false}
      destroyOnClose
      maskClosable
      styles={{
        header: { display: "none" },
        body: {
          padding: 0,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: "transparent",
        },
        content: {
          background: "linear-gradient(180deg, #020617 0%, #0f172a 100%)",
          color: "#e2e8f0",
        },
      }}
    >
      <div className="cs-mobile-sidebar__head">
        <div className="cs-mobile-sidebar__head-text">
          <BrandLogo height={48} variant="onDark" className="cs-mobile-sidebar__logo" />
          {subtitle ? <div className="cs-mobile-sidebar__sub">{subtitle}</div> : null}
          {subtitle ? <div className="cs-mobile-sidebar__sub">{subtitle}</div> : null}
        </div>
        <button type="button" className="cs-mobile-sidebar__close" onClick={onClose} aria-label="Menyuni yopish">
          <CloseOutlined />
        </button>
      </div>
      <div className="cs-mobile-sidebar__body">{children}</div>
    </Drawer>
  );
}

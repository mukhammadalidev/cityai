import { Drawer } from "antd";
import { CloseOutlined } from "@ant-design/icons";

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
        body: { padding: 0, display: "flex", flexDirection: "column", overflow: "hidden" },
        content: { background: "#0b1220" },
      }}
    >
      <div className="cs-mobile-sidebar__head">
        <div className="cs-mobile-sidebar__head-text">
          {title ? <div className="cs-mobile-sidebar__title">{title}</div> : null}
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

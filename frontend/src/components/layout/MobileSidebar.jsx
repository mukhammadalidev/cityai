import { Drawer } from "antd";

export default function MobileSidebar({ open, onClose, children }) {
  return (
    <Drawer
      title="Menyu"
      placement="left"
      onClose={onClose}
      open={open}
      width="min(84vw, 300px)"
      className="cs-mobile-sidebar"
      styles={{ body: { padding: 0 }, content: { background: "#0b1220" } }}
    >
      {children}
    </Drawer>
  );
}

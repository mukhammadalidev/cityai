import { Drawer } from "antd";

export default function MobileSidebar({ open, onClose, children }) {
  return (
    <Drawer title="Menyu" placement="left" onClose={onClose} open={open} width={280} styles={{ body: { padding: 0 } }}>
      {children}
    </Drawer>
  );
}

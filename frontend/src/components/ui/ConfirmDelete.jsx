import { Modal } from "antd";

export function confirmDelete({ title, onOk }) {
  Modal.confirm({
    title: title || "O‘chirishni tasdiqlaysizmi?",
    okText: "Ha, o‘chirish",
    okType: "danger",
    cancelText: "Bekor",
    onOk,
  });
}

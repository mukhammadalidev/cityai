import { Card } from "antd";
import StatusTag from "../ui/StatusTag";
import { BOOKING_STATUS } from "../../config/statusConfigs";
import { formatDate, formatPhone } from "../../utils/formatters";

export default function BookingCard({ booking, onClick, metaLine }) {
  const time =
    booking.preferred_time != null && booking.preferred_time !== ""
      ? String(booking.preferred_time).slice(0, 5)
      : "—";

  return (
    <Card className="cs-booking-card" hoverable onClick={onClick}>
      <div className="cs-booking-card__row">
        <span className="cs-booking-card__name">{booking.name || "—"}</span>
        <StatusTag map={BOOKING_STATUS} value={booking.status} />
      </div>
      <div style={{ fontSize: 13, color: "var(--muted)" }}>{formatPhone(booking.phone)}</div>
      <div className="cs-booking-card__datetime">
        {formatDate(booking.preferred_date)} · {time}
        {booking.guests_count != null ? ` · ${booking.guests_count} kishi` : ""}
      </div>
      {metaLine ? <div className="cs-booking-card__meta">{metaLine}</div> : null}
      {booking.note ? (
        <div className="cs-booking-card__meta" style={{ marginTop: 4 }}>
          {booking.note}
        </div>
      ) : null}
    </Card>
  );
}

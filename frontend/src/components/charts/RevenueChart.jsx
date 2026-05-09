import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

/** Demo placeholder — backend daromad vaqt qatorini bermasa bo‘sh */
export default function RevenueChart({ data = [] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data.length ? data : [{ m: "—", v: 0 }]}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="m" />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey="v" stroke="#52c41a" fill="#52c41a" fillOpacity={0.15} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

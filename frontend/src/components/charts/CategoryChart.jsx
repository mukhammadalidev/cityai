import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export default function CategoryChart({ data }) {
  const rows = (data || []).map((d) => ({
    name: (d.category__name || "—").slice(0, 12),
    count: d.c,
  }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" width={90} tick={{ fontSize: 10 }} />
        <Tooltip />
        <Bar dataKey="count" fill="#722ed1" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

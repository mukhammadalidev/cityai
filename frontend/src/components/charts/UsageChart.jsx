import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";

export default function UsageChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data?.length ? data : [{ n: "—", t: 0 }]}>
        <XAxis dataKey="n" hide />
        <YAxis />
        <Tooltip />
        <Bar dataKey="t" fill="#1677ff" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

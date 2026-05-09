import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

/** @param {{ data: Array<{ title: string; students: number; subtotal?: string }>; metric?: "students" | "subtotal" }} props */
export default function EducationCoursesChart({ data, metric = "students" }) {
  const rows = (data || []).map((d) => ({
    name: d.title?.length > 18 ? `${d.title.slice(0, 18)}…` : d.title || "—",
    value: metric === "subtotal" ? Number(d.subtotal || 0) : d.students || 0,
  }));
  const fill = metric === "subtotal" ? "#1677ff" : "#722ed1";
  const name = metric === "subtotal" ? "Summa (raqam)" : "O‘quvchilar";
  if (!rows.length) {
    return (
      <div
        style={{
          height: 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#999",
        }}
      >
        Kurslar bo‘yicha ma’lumot yo‘q
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 8, bottom: 48 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-28} textAnchor="end" height={72} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Bar dataKey="value" name={name} fill={fill} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

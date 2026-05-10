import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { message } from "antd";
import PortalStudentPage from "./PortalStudentPage";
import * as portalService from "../../services/portalService";

vi.mock("../../services/portalService", () => ({
  getStudentPortalSummary: vi.fn(),
}));

const mockSummary = {
  business: { name: "Demo o‘quv markazi", city: "Samarqand" },
  student: {
    name: "O‘quvchi Test",
    phone: "998901112233",
    group_name: "10-A",
    course_title: "Ingliz tili",
    status: "active",
  },
  group_teacher_name: "Karimova M.",
  ratings_month: { count: 4, avg_points: 3.7 },
  ratings_rank_month: {
    rank: 1,
    peers_graded: 8,
    scope_label: "Guruh bo‘yicha",
  },
  recent_ratings: [
    { id: 1, rated_at: "2026-05-01", title: "Speaking", points: 5, comment: "Zo‘r" },
  ],
  attendance_month: { marked_days: 12, present_days: 11, rate_percent: 92 },
  recent_attendance: [{ id: 1, date: "2026-05-02", status: "present", note: "" }],
  portal_quizzes: [],
};

function cardByTitle(title) {
  const headings = screen.getAllByText(title);
  const head = headings.find((el) => el.closest(".ant-card-head"));
  if (!head) throw new Error(`Card head not found for: ${title}`);
  const card = head.closest(".ant-card");
  if (!card) throw new Error(`Card not found for: ${title}`);
  return card;
}

describe("PortalStudentPage", () => {
  beforeEach(() => {
    vi.mocked(portalService.getStudentPortalSummary).mockReset();
  });

  it("yuklangandan keyin markaz, profil, baholar va davomatni ko‘rsatadi", async () => {
    vi.mocked(portalService.getStudentPortalSummary).mockResolvedValue(mockSummary);
    render(<PortalStudentPage />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Demo o‘quv markazi" })).toBeInTheDocument();
    });

    expect(screen.getByText(/Samarqand/)).toBeInTheDocument();

    const profileCard = cardByTitle("Mening profilim");
    expect(within(profileCard).getByText("O‘quvchi Test")).toBeInTheDocument();
    expect(within(profileCard).getByText("Karimova M.")).toBeInTheDocument();

    const ratingsCard = cardByTitle("Baholar (joriy oy)");
    expect(
      within(ratingsCard).getByText("Baho yozuvlari").closest(".ant-statistic"),
    ).toHaveTextContent("4");
    expect(
      within(ratingsCard).getByText("O‘rtacha ball").closest(".ant-statistic"),
    ).toHaveTextContent("3.7");
    expect(within(ratingsCard).getByText("1 / 8")).toBeInTheDocument();

    const attCard = cardByTitle("Davomat (joriy oy)");
    expect(
      within(attCard).getByText("Belgilangan kunlar").closest(".ant-statistic"),
    ).toHaveTextContent("12");
    expect(
      within(attCard).getByText("Keldi (+ kechikdi)").closest(".ant-statistic"),
    ).toHaveTextContent("11");
    expect(within(attCard).getByText("Foiz").closest(".ant-statistic")).toHaveTextContent("92%");

    expect(cardByTitle("So‘nggi baholar")).toBeInTheDocument();
    expect(cardByTitle("Davomat jadvali")).toBeInTheDocument();
    expect(cardByTitle("Mock testlar va quizlar")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Matematika" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Ingliz tili" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Arab tili" })).toBeInTheDocument();
  });

  it("API xatosi bo‘lsa xabar va fallback matn", async () => {
    const spy = vi.spyOn(message, "error").mockImplementation(() => {});
    vi.mocked(portalService.getStudentPortalSummary).mockRejectedValue(new Error("network"));

    render(<PortalStudentPage />);

    await waitFor(() => {
      expect(screen.getByText("Yuklash muvaffaqiyatsiz.")).toBeInTheDocument();
    });
    expect(spy).toHaveBeenCalledWith("Ma’lumot yuklanmadi.");
    spy.mockRestore();
  });
});

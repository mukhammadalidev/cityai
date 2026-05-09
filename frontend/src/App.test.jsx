import { render, screen } from "@testing-library/react";
import App from "./App";

vi.mock("./routes/AppRoutes", () => ({
  default: () => <div>routes-ready</div>,
}));

describe("App", () => {
  it("renders router shell", () => {
    render(<App />);
    expect(screen.getByText("routes-ready")).toBeInTheDocument();
  });
});

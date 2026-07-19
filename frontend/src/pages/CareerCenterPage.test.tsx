import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import CareerCenterPage from "./CareerCenterPage";

vi.mock("../hooks/usePublicStats", () => ({
  default: () => ({ stats: { students: 14, courses: 6, lessonsCompleted: 93, certificates: 4 }, isLoading: false }),
}));

describe("CareerCenterPage", () => {
  it("shows real statistics and working career destinations without draft promises", () => {
    render(<MemoryRouter><CareerCenterPage /></MemoryRouter>);
    expect(screen.getByRole("heading", { name: /Путь от первого урока/ })).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Открыть вакансии" })).toHaveAttribute("href", "/jobs");
    expect(screen.getByRole("link", { name: "«Участники»" })).toHaveAttribute("href", "/find-employee");
    expect(screen.queryByText(/Позже можно сделать/)).not.toBeInTheDocument();
  });
});

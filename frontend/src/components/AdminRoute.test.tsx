import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/api";
import AdminRoute from "./AdminRoute";

vi.mock("../services/api", () => ({
  default: { get: vi.fn() },
}));

const getMock = vi.mocked(api.get);

function renderAdminRoute() {
  return render(
    <MemoryRouter initialEntries={["/admin"]}>
      <Routes>
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <div>Панель администратора</div>
            </AdminRoute>
          }
        />
        <Route path="/login" element={<div>Страница входа</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("AdminRoute", () => {
  beforeEach(() => {
    getMock.mockReset();
    localStorage.setItem("token", "signed-token");
  });

  it("shows the service failure and retries access verification", async () => {
    getMock
      .mockRejectedValueOnce({
        response: {
          status: 503,
          data: {
            code: "AUTH_SERVICE_UNAVAILABLE",
            message: "Сервис проверки доступа временно недоступен. Повторите попытку.",
          },
        },
      })
      .mockResolvedValueOnce({ data: { user: { id: 7, roles: ["ADMIN"] } } });

    renderAdminRoute();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Сервис проверки доступа временно недоступен",
    );
    fireEvent.click(screen.getByRole("button", { name: "Повторить проверку" }));

    expect(await screen.findByText("Панель администратора")).toBeInTheDocument();
    expect(getMock).toHaveBeenCalledTimes(2);
    expect(localStorage.getItem("token")).toBe("signed-token");
  });

  it("clears an invalid session and redirects to login", async () => {
    getMock.mockRejectedValueOnce({
      response: { status: 401, data: { code: "AUTH_SESSION_EXPIRED" } },
    });

    renderAdminRoute();

    await waitFor(() => expect(screen.getByText("Страница входа")).toBeInTheDocument());
    expect(localStorage.getItem("token")).toBeNull();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/api";
import { showToast } from "../services/appToast";
import AdminPage from "./AdminPage";

vi.mock("../components/AuthSessionProvider", () => ({
  useAuthSession: () => ({ user: { id: 2, username: "Frame Admin", roles: ["ADMIN"] } }),
}));

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), put: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock("../services/appToast", () => ({ showToast: vi.fn() }));

const getMock = vi.mocked(api.get);
const postMock = vi.mocked(api.post);
const toastMock = vi.mocked(showToast);
const supportRequest = {
  id: 27,
  text: "Проверка доставки из плавающего виджета.",
  status: "answered",
  createdAt: "2026-07-19T12:00:00.000Z",
  name: null,
  email: null,
  user: { username: "Test Student", email: "student@example.test" },
  replies: [{
    id: 28,
    text: "Первый ответ поддержки.",
    parentId: 27,
    status: "answered",
    createdAt: "2026-07-19T12:01:00.000Z",
  }],
};

function mockLoads() {
  getMock.mockImplementation(async (url) => {
    if (url === "/admin/stats") return { data: { stats: { openSupport: 1 } } };
    if (url === "/support") return { data: { success: true, data: [supportRequest] } };
    throw new Error(`Unexpected GET ${url}`);
  });
}

function renderPage() {
  return render(<MemoryRouter initialEntries={["/admin/support"]}><AdminPage /></MemoryRouter>);
}

describe("AdminPage support thread", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    toastMock.mockReset();
    mockLoads();
  });

  it("shows the delivered request and its persisted reply thread", async () => {
    renderPage();
    expect(await screen.findByText("Test Student")).toBeInTheDocument();
    expect(screen.getByText(supportRequest.text)).toBeInTheDocument();
    expect(screen.getByText("Первый ответ поддержки.")).toBeInTheDocument();
  });

  it("shows success only when the backend returns a reply linked to the selected request", async () => {
    postMock.mockResolvedValueOnce({
      data: {
        success: true,
        message: "Ответ отправлен.",
        data: { id: 29, parentId: 27, text: "Второй подтверждённый ответ." },
      },
    });
    renderPage();
    expect(await screen.findByText("Test Student")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ответить ещё" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Текст ответа" }), {
      target: { value: "Второй подтверждённый ответ." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => expect(postMock).toHaveBeenCalledWith("/support/27/reply", { text: "Второй подтверждённый ответ." }));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ tone: "success", title: "Ответ поддержки" })));
    expect(screen.queryByRole("form", { name: "Форма ответа поддержки" })).not.toBeInTheDocument();
  });

  it("keeps the reply form open when persistence is not confirmed", async () => {
    postMock.mockResolvedValueOnce({ data: { success: false, message: "Сохранение не подтверждено." } });
    renderPage();
    expect(await screen.findByText("Test Student")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ответить ещё" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Текст ответа" }), {
      target: { value: "Этот ответ нельзя считать сохранённым." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ tone: "error", title: "Ответ не сохранён" })));
    expect(screen.getByRole("form", { name: "Форма ответа поддержки" })).toBeInTheDocument();
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });
});

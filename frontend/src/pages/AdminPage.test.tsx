import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/api";
import { showToast } from "../services/appToast";
import AdminPage from "./AdminPage";

vi.mock("../components/AuthSessionProvider", () => ({
  useAuthSession: () => ({ user: { id: 21, username: "Frame Developer", roles: ["DEVELOPER"] } }),
}));

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), put: vi.fn(), patch: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

vi.mock("../services/appToast", () => ({ showToast: vi.fn() }));

const getMock = vi.mocked(api.get);
const putMock = vi.mocked(api.put);
const toastMock = vi.mocked(showToast);
const review = {
  id: 91,
  rating: 5,
  text: "Подтверждённый отзыв студента для проверки ответа из админки.",
  isHidden: false,
  createdAt: "2026-07-19T00:00:00.000Z",
  author: { username: "Test Student", roles: [] },
  comments: [],
  officialReply: null,
};

function mockLoads() {
  getMock.mockImplementation(async (url) => {
    if (url === "/admin/stats") return { data: { stats: { users: 1 } } };
    if (url === "/reviews") return { data: { success: true, reviews: [review] } };
    throw new Error(`Unexpected GET ${url}`);
  });
}

function renderPage() {
  return render(<MemoryRouter initialEntries={["/admin/reviews"]}><AdminPage /></MemoryRouter>);
}

describe("AdminPage official review reply", () => {
  beforeEach(() => {
    getMock.mockReset();
    putMock.mockReset();
    toastMock.mockReset();
    mockLoads();
  });

  it("opens the form and reports success only after the backend confirms the reply", async () => {
    putMock.mockResolvedValueOnce({
      data: {
        success: true,
        operation: "created",
        message: "Официальный ответ опубликован.",
        officialReply: { id: 501, text: "Спасибо за подробный отзыв!", label: "Ответ разработчика" },
      },
    });
    renderPage();

    expect(await screen.findByText("Test Student")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Официальный ответ" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Текст ответа" }), { target: { value: "Спасибо за подробный отзыв!" } });
    fireEvent.click(screen.getByRole("button", { name: "Опубликовать ответ" }));

    await waitFor(() => expect(putMock).toHaveBeenCalledWith("/reviews/91/official-reply", { text: "Спасибо за подробный отзыв!" }));
    await waitFor(() => expect(screen.queryByRole("form", { name: "Форма официального ответа" })).not.toBeInTheDocument());
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ tone: "success", title: "Официальный ответ" }));
  });

  it("keeps the form open and does not show false success without backend confirmation", async () => {
    putMock.mockResolvedValueOnce({ data: { success: false, message: "Сохранение не подтверждено." } });
    renderPage();

    expect(await screen.findByText("Test Student")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Официальный ответ" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Текст ответа" }), { target: { value: "Ответ не должен считаться сохранённым." } });
    fireEvent.click(screen.getByRole("button", { name: "Опубликовать ответ" }));

    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ tone: "error", title: "Ответ не сохранён" })));
    expect(screen.getByRole("form", { name: "Форма официального ответа" })).toBeInTheDocument();
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });
});

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
const postMock = vi.mocked(api.post);
const deleteMock = vi.mocked(api.delete);
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
    deleteMock.mockReset();
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

  it("requires confirmation and permanently removes a review from the admin list", async () => {
    deleteMock.mockResolvedValueOnce({ data: { success: true, deletedId: 91, message: "Отзыв удалён навсегда." } });
    renderPage();

    expect(await screen.findByText("Test Student")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Удалить отзыв" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Удалить отзыв навсегда?");
    fireEvent.click(screen.getByRole("button", { name: "Удалить навсегда" }));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("/reviews/91"));
    await waitFor(() => expect(screen.queryByText("Test Student")).not.toBeInTheDocument());
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ tone: "success", title: "Отзыв удалён" }));
  });
});

describe("AdminPage manual Premium controls", () => {
  let premiumUpdated = false;

  beforeEach(() => {
    premiumUpdated = false;
    getMock.mockReset();
    postMock.mockReset();
    toastMock.mockReset();
    getMock.mockImplementation(async (url) => {
      if (url === "/admin/stats") return { data: { stats: { users: 1, premiumUsers: premiumUpdated ? 1 : 0 } } };
      if (url === "/admin/users") return {
        data: {
          success: true,
          users: [{
            id: 7,
            username: "Premium Student",
            email: "premium@example.test",
            roles: [],
            accountStatus: "ACTIVE",
            isPremium: premiumUpdated,
            premiumUntil: premiumUpdated ? "2026-08-18T12:00:00.000Z" : null,
            premiumOverride: premiumUpdated ? { mode: "FORCE_ENABLED", validUntil: "2026-08-18T12:00:00.000Z", reason: "Доступ на проверку" } : null,
          }],
        },
      };
      throw new Error(`Unexpected GET ${url}`);
    });
  });

  function renderUsersPage() {
    return render(<MemoryRouter initialEntries={["/admin/users"]}><AdminPage /></MemoryRouter>);
  }

  it("grants a dated override only after reason and explicit confirmation, then refreshes the visible status", async () => {
    postMock.mockImplementation(async () => {
      premiumUpdated = true;
      return { data: { success: true, message: "Настройка Premium обновлена." } };
    });
    renderUsersPage();

    fireEvent.click(await screen.findByRole("button", { name: "Управлять" }));
    expect(screen.getByText("нет активного периода")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect((screen.getByLabelText("Дата и время окончания") as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(screen.getByText(/Выбранный срок:/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "30 дней" }));
    fireEvent.change(screen.getByRole("textbox", { name: /Причина изменения/ }), { target: { value: "Доступ на проверку" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Подтверждаю ручное изменение Premium/ }));
    fireEvent.click(screen.getByRole("button", { name: "Включить Premium" }));

    await waitFor(() => expect(postMock).toHaveBeenCalledWith("/admin/users/7/premium-override", expect.objectContaining({
      mode: "FORCE_ENABLED",
      reason: "Доступ на проверку",
      validUntil: expect.any(String),
      confirmed: true,
    })));
    expect((await screen.findAllByText(/вручную включён/)).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Причина: Доступ на проверку/).length).toBeGreaterThan(0);
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ tone: "success", title: "Premium обновлён" }));
  });

  it("shows a precise inline reason error without calling the API", async () => {
    renderUsersPage();
    fireEvent.click(await screen.findByRole("button", { name: "Управлять" }));
    fireEvent.click(screen.getByRole("button", { name: "Включить Premium" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Укажите понятную причину не короче 5 символов.");
    expect(postMock).not.toHaveBeenCalled();
  });
});

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/api";
import { showToast } from "../services/appToast";
import ReviewsPage from "./ReviewsPage";

vi.mock("../components/AuthSessionProvider", () => ({
  useAuthSession: () => ({ user: { id: 7, username: "Test Student" }, isAuthenticated: true }),
}));

vi.mock("../services/api", () => ({
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("../services/appToast", () => ({ showToast: vi.fn() }));

const getMock = vi.mocked(api.get);
const postMock = vi.mocked(api.post);
const toastMock = vi.mocked(showToast);
const savedReview = {
  id: 91,
  name: "Test Student",
  text: "Подтверждённый отзыв длиной больше двадцати символов.",
  rating: 4,
  direction: "Общее впечатление",
  userId: 7,
  createdAt: "2026-07-19T00:00:00.000Z",
  updatedAt: "2026-07-19T00:00:00.000Z",
  author: { id: 7, username: "Test Student", roles: [] },
  comments: [],
  officialReply: null,
};

function renderPage() {
  return render(<MemoryRouter><ReviewsPage /></MemoryRouter>);
}

describe("ReviewsPage persistence confirmation", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    toastMock.mockReset();
    getMock.mockResolvedValueOnce({ data: { success: true, reviews: [] } });
  });

  it("shows success only after the saved review appears in a fresh server list", async () => {
    postMock.mockResolvedValueOnce({
      data: { success: true, operation: "created", message: "Отзыв опубликован.", review: savedReview },
    });
    getMock.mockResolvedValueOnce({ data: { success: true, reviews: [savedReview] } });
    renderPage();

    expect(await screen.findByText("Отзывов пока нет")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "4" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Текст" }), { target: { value: savedReview.text } });
    fireEvent.click(screen.getByRole("button", { name: "Опубликовать отзыв" }));

    expect(await screen.findByText(savedReview.text)).toBeInTheDocument();
    const publishedMetric = screen.getByText("Опубликовано").parentElement;
    expect(publishedMetric && within(publishedMetric).getByText("1")).toBeInTheDocument();
    expect(screen.getByText("4.0 / 5")).toBeInTheDocument();
    expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ tone: "success", title: "Отзыв опубликован" }));
    expect(getMock).toHaveBeenCalledTimes(2);
  });

  it("does not show false success when the fresh public list is still missing the review", async () => {
    postMock.mockResolvedValueOnce({
      data: { success: true, operation: "created", message: "Отзыв опубликован.", review: savedReview },
    });
    getMock.mockResolvedValueOnce({ data: { success: true, reviews: [] } });
    renderPage();

    expect(await screen.findByText("Отзывов пока нет")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Текст" }), { target: { value: savedReview.text } });
    fireEvent.click(screen.getByRole("button", { name: "Опубликовать отзыв" }));

    await waitFor(() => expect(postMock).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(toastMock).toHaveBeenCalledWith(expect.objectContaining({ tone: "error", title: "Отзыв не сохранён" })));
    expect(toastMock).not.toHaveBeenCalledWith(expect.objectContaining({ tone: "success" }));
  });
});

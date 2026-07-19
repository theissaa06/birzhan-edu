import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  appealSubmissionReview,
  getMySubmissions,
  retrySubmissionReview,
} from "../services/submissions";
import SubmissionReviewPanel from "./SubmissionReviewPanel";

vi.mock("../services/submissions", () => ({
  getMySubmissions: vi.fn(),
  appealSubmissionReview: vi.fn(),
  retrySubmissionReview: vi.fn(),
}));

const loadMock = vi.mocked(getMySubmissions);
const appealMock = vi.mocked(appealSubmissionReview);
const retryMock = vi.mocked(retrySubmissionReview);

describe("SubmissionReviewPanel", () => {
  beforeEach(() => {
    loadMock.mockReset();
    appealMock.mockReset();
    retryMock.mockReset();
  });

  it("shows structured feedback with a timecode and submits a manual appeal", async () => {
    loadMock.mockResolvedValue([{ id: 91, lessonId: 8, type: "video", url: "https://example.test/video.mp4", status: "needs_changes", isPublic: false, attemptNumber: 2, createdAt: "2026-07-19T10:00:00.000Z", autoReview: { id: 4, status: "NEEDS_CHANGES", result: { score: 68, summary: "Исправьте переход между сценами.", criteria: [{ key: "transition", title: "Переходы", required: true, passed: false, feedback: "Склейка слишком резкая.", timecode: "00:12" }] } }, appeal: null }]);
    appealMock.mockResolvedValue("Работа передана на пересмотр.");
    render(<SubmissionReviewPanel lessonId={8} refreshKey={0} />);

    expect(await screen.findByText("Исправьте переход между сценами.")).toBeInTheDocument();
    expect(screen.getByText("00:12")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Не согласен с оценкой" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Почему решение нужно пересмотреть" }), { target: { value: "Переход соответствует референсу задания." } });
    fireEvent.click(screen.getByRole("button", { name: "Передать на пересмотр" }));

    await waitFor(() => expect(appealMock).toHaveBeenCalledWith(91, "Переход соответствует референсу задания."));
  });

  it("treats a provider failure as retryable instead of rejected", async () => {
    loadMock.mockResolvedValue([{ id: 92, lessonId: 8, type: "video", url: "https://example.test/video.mp4", status: "submitted", isPublic: false, attemptNumber: 1, createdAt: "2026-07-19T10:00:00.000Z", autoReview: { id: 5, status: "FAILED", errorCode: "AI_TIMEOUT", errorMessage: "Gemini не ответил вовремя." }, appeal: null }]);
    retryMock.mockResolvedValue("Проверка запущена повторно.");
    render(<SubmissionReviewPanel lessonId={8} refreshKey={0} />);

    expect(await screen.findByText("Проверка прервана")).toBeInTheDocument();
    expect(screen.queryByText("Нужна доработка")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Повторить проверку" }));
    await waitFor(() => expect(retryMock).toHaveBeenCalledWith(92));
  });
});

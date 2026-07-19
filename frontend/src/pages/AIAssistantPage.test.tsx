import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteAIConversation,
  getAIConversation,
  getAIConversations,
  getAIOptions,
  getAIStatus,
  sendAIMessage,
} from "../services/ai";
import AIAssistantPage from "./AIAssistantPage";

vi.mock("../components/AuthSessionProvider", () => ({
  useAuthSession: () => ({
    user: { id: 7, username: "Test Student" },
    isAuthenticated: true,
  }),
}));

vi.mock("../services/ai", () => ({
  getAIStatus: vi.fn(),
  getAIOptions: vi.fn(),
  getAIConversations: vi.fn(),
  getAIConversation: vi.fn(),
  deleteAIConversation: vi.fn(),
  sendAIMessage: vi.fn(),
}));

const statusMock = vi.mocked(getAIStatus);
const optionsMock = vi.mocked(getAIOptions);
const conversationsMock = vi.mocked(getAIConversations);
const conversationMock = vi.mocked(getAIConversation);
const deleteMock = vi.mocked(deleteAIConversation);
const sendMock = vi.mocked(sendAIMessage);

const modes = [
  { id: "assistant", label: "Помощник", description: "Ответы" },
  { id: "mentor", label: "Наставник", description: "По шагам" },
  { id: "ideas", label: "Идеи", description: "Концепции" },
  { id: "reviewer", label: "Разбор", description: "Проверка" },
];
const actions = [
  { id: "answer", label: "Ответ", description: "Ответ" },
  { id: "summary", label: "Конспект", description: "Конспект" },
  { id: "video_plan", label: "План ролика", description: "План" },
  { id: "quiz", label: "Мини-тест", description: "Тест" },
  { id: "rewrite", label: "Улучшить текст", description: "Редактура" },
];
const savedConversation = {
  id: "conversation-1",
  title: "Старый диалог",
  mode: "reviewer",
  lastMessageAt: "2026-07-19T19:30:00.000Z",
  createdAt: "2026-07-19T19:30:00.000Z",
  updatedAt: "2026-07-19T19:30:00.000Z",
  preview: "Сохранённый ответ",
  messageCount: 2,
};

function renderPage() {
  return render(<MemoryRouter><AIAssistantPage /></MemoryRouter>);
}

describe("Frame AI memory and generation controls", () => {
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
    statusMock.mockReset();
    optionsMock.mockReset();
    conversationsMock.mockReset();
    conversationMock.mockReset();
    deleteMock.mockReset();
    sendMock.mockReset();
    statusMock.mockResolvedValue({ success: true, provider: "gemini", model: "gemini-test", mode: "gemini", configured: true });
    optionsMock.mockResolvedValue({ modes, actions });
    conversationsMock.mockResolvedValue([savedConversation]);
    conversationMock.mockResolvedValue({
      conversation: savedConversation,
      messages: [
        { id: "message-1", role: "user", text: "Проверь сценарий" },
        { id: "message-2", role: "assistant", text: "Сохранённый ответ" },
      ],
    });
  });

  it("reopens server memory and restores the saved mode", async () => {
    renderPage();
    const savedTitle = await screen.findByText("Старый диалог");
    fireEvent.click(savedTitle.closest("button") as HTMLButtonElement);

    expect((await screen.findAllByText("Сохранённый ответ")).length).toBeGreaterThan(0);
    expect(conversationMock).toHaveBeenCalledWith("conversation-1");
    expect(screen.getByRole("button", { name: "Разбор" })).toHaveAttribute("aria-pressed", "true");
  });

  it("sends the selected mode and content action, then shows only confirmed output", async () => {
    sendMock.mockResolvedValueOnce({
      success: true,
      answer: "Готовый структурированный конспект",
      source: "gemini",
      conversation: { ...savedConversation, id: "conversation-2", title: "Материал урока", mode: "ideas", preview: "Готовый структурированный конспект" },
    });
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: "Идеи" }));
    fireEvent.click(screen.getByRole("button", { name: "Конспект" }));
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Материал урока" } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить" }));

    await waitFor(() => expect(sendMock).toHaveBeenCalledWith("Материал урока", [], {
      conversationId: null,
      mode: "ideas",
      action: "summary",
    }));
    expect((await screen.findAllByText("Готовый структурированный конспект")).length).toBeGreaterThan(0);
    const conversationTitle = screen.getAllByText("Материал урока").find((element) => element.tagName === "STRONG");
    expect(conversationTitle?.closest("button")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ответ" })).toHaveAttribute("aria-pressed", "true");
  });
});

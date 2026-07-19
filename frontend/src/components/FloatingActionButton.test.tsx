import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FloatingActionButton from "./FloatingActionButton";
import { getMySupportMessages, sendSupportMessage, type SupportMessage } from "../services/support";

vi.mock("../services/support", () => ({
  getMySupportMessages: vi.fn(),
  sendSupportMessage: vi.fn(),
}));

vi.mock("./AuthSessionProvider", () => ({
  useAuthSession: () => ({ user: { id: 1, username: "Test Student", avatarUrl: "/api/users/1/avatar?v=1" } }),
}));

const getMessagesMock = vi.mocked(getMySupportMessages);
const sendMessageMock = vi.mocked(sendSupportMessage);
const storedMessage: SupportMessage = {
  id: 27,
  text: "Проверка доставки сообщения поддержки.",
  from: "user",
  userId: 1,
  parentId: null,
  status: "open",
  createdAt: "2026-07-19T12:00:00.000Z",
};

async function openChat() {
  fireEvent.click(screen.getByRole("button", { name: "Открыть меню поддержки" }));
  fireEvent.click(screen.getByRole("button", { name: "Открыть чат поддержки" }));
  await waitFor(() => expect(getMessagesMock).toHaveBeenCalledTimes(1));
  return screen.getByRole("textbox", { name: "Сообщение в поддержку" });
}

describe("FloatingActionButton support delivery", () => {
  beforeEach(() => {
    localStorage.setItem("token", "test-session");
    getMessagesMock.mockReset();
    sendMessageMock.mockReset();
    getMessagesMock.mockResolvedValue([]);
  });

  it("sends by button and reports success only after the stored message is read back", async () => {
    getMessagesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([storedMessage]);
    sendMessageMock.mockResolvedValueOnce(storedMessage);
    render(<FloatingActionButton />);
    const textbox = await openChat();

    fireEvent.change(textbox, { target: { value: storedMessage.text } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить сообщение" }));

    await waitFor(() => expect(sendMessageMock).toHaveBeenCalledTimes(1));
    expect(sendMessageMock).toHaveBeenCalledWith({
      text: storedMessage.text,
      clientRequestId: expect.any(String),
    });
    expect(await screen.findByText("Сообщение сохранено и передано в поддержку.")).toBeInTheDocument();
    expect(screen.getByText(storedMessage.text)).toBeInTheDocument();
    expect(textbox).toHaveValue("");
  });

  it("uses Enter to send and leaves Shift+Enter for a new line", async () => {
    getMessagesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([storedMessage]);
    sendMessageMock.mockResolvedValueOnce(storedMessage);
    render(<FloatingActionButton />);
    const textbox = await openChat();
    fireEvent.change(textbox, { target: { value: storedMessage.text } });

    fireEvent.keyDown(textbox, { key: "Enter", shiftKey: true });
    expect(sendMessageMock).not.toHaveBeenCalled();

    fireEvent.keyDown(textbox, { key: "Enter", shiftKey: false });
    await waitFor(() => expect(sendMessageMock).toHaveBeenCalledTimes(1));
  });

  it("blocks duplicate clicks while the same request is in flight", async () => {
    let resolveSend!: (value: SupportMessage) => void;
    sendMessageMock.mockImplementationOnce(() => new Promise((resolve) => { resolveSend = resolve; }));
    getMessagesMock.mockResolvedValueOnce([]).mockResolvedValueOnce([storedMessage]);
    render(<FloatingActionButton />);
    const textbox = await openChat();
    fireEvent.change(textbox, { target: { value: storedMessage.text } });
    const sendButton = screen.getByRole("button", { name: "Отправить сообщение" });

    fireEvent.click(sendButton);
    fireEvent.click(sendButton);
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Сообщение отправляется" })).toBeDisabled();

    resolveSend(storedMessage);
    expect(await screen.findByText("Сообщение сохранено и передано в поддержку.")).toBeInTheDocument();
  });

  it("shows a visible error, keeps the draft, and never shows false success", async () => {
    sendMessageMock.mockRejectedValueOnce({ response: { data: { message: "Сервис поддержки временно недоступен." } } });
    render(<FloatingActionButton />);
    const textbox = await openChat();
    fireEvent.change(textbox, { target: { value: storedMessage.text } });
    fireEvent.click(screen.getByRole("button", { name: "Отправить сообщение" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Сервис поддержки временно недоступен.");
    expect(textbox).toHaveValue(storedMessage.text);
    expect(screen.queryByText("Сообщение сохранено и передано в поддержку.")).not.toBeInTheDocument();
  });
});

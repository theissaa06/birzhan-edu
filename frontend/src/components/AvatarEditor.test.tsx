import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/api";
import AvatarEditor from "./AvatarEditor";

vi.mock("../services/api", () => ({
  API_ORIGIN: "https://frame.test",
  default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
}));

const getMock = vi.mocked(api.get);
const postMock = vi.mocked(api.post);
const deleteMock = vi.mocked(api.delete);
const presets = [
  { id: "cyan-cut", label: "Cyan Cut", avatarUrl: "/api/users/avatar-presets/cyan-cut" },
  { id: "magenta-key", label: "Magenta Key", avatarUrl: "/api/users/avatar-presets/magenta-key" },
];

describe("AvatarEditor", () => {
  beforeEach(() => {
    getMock.mockReset();
    postMock.mockReset();
    deleteMock.mockReset();
    getMock.mockResolvedValue({ data: { success: true, data: presets } });
  });

  it("selects and persists a standard avatar only after explicit confirmation", async () => {
    const onSaved = vi.fn();
    postMock.mockResolvedValueOnce({
      data: { success: true, data: { avatarUrl: "/api/users/1/avatar?v=2", avatarKind: "PRESET", avatarPreset: "cyan-cut" } },
    });
    render(<AvatarEditor username="Test Student" avatarUrl="/api/users/1/avatar?v=1" onSaved={onSaved} />);

    const option = await screen.findByTitle("Cyan Cut");
    fireEvent.click(option);
    expect(option).toHaveAttribute("aria-checked", "true");
    expect(postMock).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Применить выбранный" }));

    await waitFor(() => expect(postMock).toHaveBeenCalledWith("/users/me/avatar/preset", { presetId: "cyan-cut" }));
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ avatarKind: "PRESET", avatarPreset: "cyan-cut" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Стандартный аватар сохранён.");
  });

  it("rejects unsupported files before sending anything to the server", async () => {
    render(<AvatarEditor username="Test Student" onSaved={vi.fn()} />);
    const input = screen.getByLabelText("Выбрать JPG, PNG или WEBP");
    fireEvent.change(input, { target: { files: [new File(["plain text"], "avatar.txt", { type: "text/plain" })] } });

    expect(await screen.findByRole("alert")).toHaveTextContent("Поддерживаются только изображения JPG, PNG и WEBP.");
    expect(postMock).not.toHaveBeenCalled();
  });

  it("resets to meaningful initials only after the backend confirms the change", async () => {
    const onSaved = vi.fn();
    deleteMock.mockResolvedValueOnce({
      data: { success: true, data: { avatarUrl: "/api/users/1/avatar?v=0", avatarKind: "INITIALS", avatarPreset: null } },
    });
    render(<AvatarEditor username="Test Student" avatarUrl="/api/users/1/avatar?v=1" onSaved={onSaved} />);
    fireEvent.click(screen.getByRole("button", { name: "Использовать инициалы" }));

    await waitFor(() => expect(deleteMock).toHaveBeenCalledWith("/users/me/avatar"));
    expect(onSaved).toHaveBeenCalledWith(expect.objectContaining({ avatarKind: "INITIALS" }));
  });
});

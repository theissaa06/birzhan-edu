import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../services/api";
import OAuthButtons from "./OAuthButtons";

vi.mock("./AuthSessionProvider", () => ({
  useAuthSession: () => ({ signIn: vi.fn() }),
}));

vi.mock("../services/api", () => ({
  API_BASE_URL: "",
  default: { get: vi.fn(), post: vi.fn() },
}));

vi.mock("../services/appToast", () => ({ showToast: vi.fn(), showLoginWelcome: vi.fn() }));

const getMock = vi.mocked(api.get);

describe("OAuthButtons provider readiness", () => {
  beforeEach(() => getMock.mockReset());

  it("renders all four registration buttons as available when Layero credentials are complete", async () => {
    getMock.mockResolvedValueOnce({ data: { success: true, data: {
      google: { configured: true, startUrl: "/api/auth/oauth/google/start" },
      apple: { configured: true, startUrl: "/api/auth/oauth/apple/start" },
      telegram: { configured: true, botName: "FrameSchoolBot" },
      vk: { configured: true, startUrl: "/api/auth/oauth/vk/start" },
    } } });
    render(<MemoryRouter><OAuthButtons action="Зарегистрироваться" /></MemoryRouter>);

    for (const provider of ["Google", "Apple ID", "Telegram", "VK"]) {
      const button = await screen.findByRole("button", { name: `Зарегистрироваться через ${provider}` });
      expect(button).toHaveAttribute("aria-disabled", "false");
      expect(button).not.toHaveTextContent("нужна настройка");
    }
    expect(screen.queryByText(/Все четыре кнопки готовы/)).not.toBeInTheDocument();
  });

  it("keeps every button visibly unavailable when provider keys are absent", async () => {
    getMock.mockResolvedValueOnce({ data: { success: true, data: {
      google: { configured: false }, apple: { configured: false }, telegram: { configured: false }, vk: { configured: false },
    } } });
    render(<MemoryRouter><OAuthButtons action="Войти" /></MemoryRouter>);

    for (const provider of ["Google", "Apple ID", "Telegram", "VK"]) {
      expect(await screen.findByRole("button", { name: new RegExp(`Войти через ${provider}`) })).toHaveAttribute("aria-disabled", "true");
    }
    expect(screen.getByText(/Все четыре кнопки готовы/)).toBeInTheDocument();
  });
});

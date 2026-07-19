import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelPremium, getPremiumStatus } from "../services/premium";
import PremiumPage from "./PremiumPage";

vi.mock("../services/premium", () => ({
  getPremiumStatus: vi.fn(),
  cancelPremium: vi.fn(),
  activatePremium: vi.fn(),
}));

const statusMock = vi.mocked(getPremiumStatus);
const cancelMock = vi.mocked(cancelPremium);

const grantedStatus = {
  userId: 7,
  isPremium: true,
  premiumPlan: "Premium PRO",
  premiumStarted: "2026-07-19T12:00:00.000Z",
  premiumUntil: null,
  premiumStatus: "force_enabled",
  source: "manual" as const,
  accessOrigin: { kind: "granted" as const, issuedByRole: "DEVELOPER" },
  override: { mode: "FORCE_ENABLED" as const, validUntil: null, reason: "Доступ выдан для обучения", issuedByRole: "DEVELOPER" },
  recoveryRequired: false,
};

const disabledStatus = {
  ...grantedStatus,
  isPremium: false,
  premiumPlan: null,
  premiumStatus: "force_disabled",
  source: "manual" as const,
  accessOrigin: { kind: "granted" as const, issuedByRole: "TEAM" },
  override: { mode: "FORCE_DISABLED" as const, validUntil: null, reason: "Отключено пользователем", issuedByRole: null },
  recoveryRequired: true,
  disabledByUser: true,
  restorationPath: "/support",
};

const paidStatus = {
  ...grantedStatus,
  premiumUntil: "2026-08-19T12:00:00.000Z",
  premiumStatus: "active",
  source: "subscription" as const,
  accessOrigin: { kind: "paid" as const, provider: "cloudpayments" },
  override: null,
};

function renderPage() {
  localStorage.setItem("token", "premium-test-token");
  return render(<MemoryRouter><PremiumPage /></MemoryRouter>);
}

describe("PremiumPage entitlement source and recovery", () => {
  beforeEach(() => {
    statusMock.mockReset();
    cancelMock.mockReset();
    statusMock.mockResolvedValue(grantedStatus);
  });

  it("shows a staff grant without requiring an artificial end date", async () => {
    renderPage();
    expect(await screen.findByText("У вас уже есть Premium PRO")).toBeInTheDocument();
    expect(screen.getByText("Доступ выдан: Developer.")).toBeInTheDocument();
    expect(screen.getByText("без ограничения по сроку")).toBeInTheDocument();
  });

  it("labels a paid subscription separately from a staff grant", async () => {
    statusMock.mockResolvedValueOnce(paidStatus);
    renderPage();
    expect(await screen.findByText("У вас уже есть Premium PRO")).toBeInTheDocument();
    expect(screen.getByText("Premium оплачен вами через CloudPayments.")).toBeInTheDocument();
    expect(screen.getByText(/19 августа 2026/)).toBeInTheDocument();
  });

  it("requires explicit disable confirmation and then offers support-only restoration", async () => {
    cancelMock.mockResolvedValueOnce(disabledStatus);
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: "Отключить Premium" }));
    expect(screen.getByRole("group", { name: "Подтверждение отключения Premium" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("checkbox", { name: "Я понимаю условия отключения" }));
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить отключение" }));

    await waitFor(() => expect(cancelMock).toHaveBeenCalledWith("Отключение доступа со страницы Premium"));
    expect(await screen.findByText("Premium отключён вами")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Написать в техподдержку" })).toHaveAttribute("href", "/support");
    expect(screen.queryByRole("button", { name: "Оформить Premium PRO" })).not.toBeInTheDocument();
  });
});

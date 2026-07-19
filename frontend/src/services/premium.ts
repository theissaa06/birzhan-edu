import api from "./api";

export type PremiumStatus = {
  userId: number;
  username?: string;
  email?: string;
  role?: string;
  adminAccess?: boolean;
  isPremium: boolean;
  premiumPlan: string | null;
  premiumStarted: string | null;
  premiumUntil: string | null;
  premiumStatus?: "free" | "active" | "grace" | "force_enabled" | "force_disabled" | string;
  source?: "manual" | "subscription" | "legacy" | null;
  graceUntil?: string | null;
  isGracePeriod?: boolean;
  needsPayment?: boolean;
  paidUntil?: string | null;
  accessOrigin?: { kind: "granted" | "paid"; issuedByRole?: string | null; provider?: string | null } | null;
  override?: { mode: "FORCE_ENABLED" | "FORCE_DISABLED"; validUntil?: string | null; reason: string; issuedByRole?: string | null } | null;
  recoveryRequired?: boolean;
  disabledByUser?: boolean;
  restorationPath?: string | null;
};

type PremiumApiResponse = {
  success: boolean;
  data?: PremiumStatus;
  message?: string;
};

export async function getPremiumStatus(): Promise<PremiumStatus> {
  const response = await api.get<PremiumApiResponse>("/premium/status");

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Не удалось загрузить Premium-статус");
  }

  return response.data.data;
}

export async function activatePremium(payload: {
  transactionId?: string;
  provider?: string;
  amount?: number;
  currency?: string;
  plan?: string;
} = {}): Promise<PremiumStatus> {
  const response = await api.post<PremiumApiResponse>(
    "/premium/activate",
    payload,
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Не удалось активировать Premium");
  }

  return response.data.data;
}

export async function cancelPremium(reason = "Отключение из личного кабинета"): Promise<PremiumStatus> {
  const response = await api.post<PremiumApiResponse>("/premium/cancel", { confirmed: true, reason });

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Не удалось отключить Premium");
  }

  return response.data.data;
}

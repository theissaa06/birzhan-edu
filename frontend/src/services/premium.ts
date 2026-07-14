import api from "./api";

export type PremiumStatus = {
  userId: number;
  username?: string;
  email?: string;
  role?: string;
  isPremium: boolean;
  premiumPlan: string | null;
  premiumStarted: string | null;
  premiumUntil: string | null;
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

export async function cancelPremium(): Promise<PremiumStatus> {
  const response = await api.post<PremiumApiResponse>("/premium/cancel");

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Не удалось отключить Premium");
  }

  return response.data.data;
}

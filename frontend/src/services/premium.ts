const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3003/api";

export type PremiumStatus = {
  isPremium: boolean;
  plan: string | null;
  startedAt: string | null;
  expiresAt: string | null;
};

export async function getPremiumStatus(userId = 1): Promise<PremiumStatus> {
  const response = await fetch(`${API_URL}/premium/status?userId=${userId}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Не удалось получить Premium-статус");
  }

  return data.data;
}

import axios from "axios";

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

const RAW_API_URL = import.meta.env.VITE_API_URL || "http://localhost:3003";

// защита от ошибки, если в .env написано http://localhost:3003/api
const API_URL = RAW_API_URL.replace(/\/api\/?$/, "");

export async function getPremiumStatus(
  userId: number = 1,
): Promise<PremiumStatus> {
  const response = await axios.get<PremiumApiResponse>(
    `${API_URL}/api/premium/status/${userId}`,
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(
      response.data.message || "Не удалось загрузить Premium-статус",
    );
  }

  return response.data.data;
}

export async function activatePremium(
  userId: number = 1,
): Promise<PremiumStatus> {
  const response = await axios.post<PremiumApiResponse>(
    `${API_URL}/api/premium/activate`,
    { userId },
  );

  if (!response.data.success || !response.data.data) {
    throw new Error(response.data.message || "Не удалось активировать Premium");
  }

  return response.data.data;
}

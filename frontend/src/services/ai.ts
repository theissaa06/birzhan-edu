import api from "./api";

export type AIMessage = {
  role: "user" | "assistant";
  text: string;
};

export type AIResponse = {
  success: boolean;
  answer?: string;
  message?: string;
  demo?: boolean;
  source?: "gemini" | "demo" | "unavailable" | string;
  code?: string;
};

export type AIStatus = {
  success: boolean;
  provider: "gemini" | string;
  model: string;
  mode: "gemini" | "demo" | "unavailable";
  configured: boolean;
};

const AI_TIMEOUT = 20000;

export async function sendAIMessage(
  message: string,
  history: AIMessage[] = [],
): Promise<AIResponse> {
  const response = await api.post<AIResponse>(
    "/ai/chat",
    { message, history },
    {
      timeout: AI_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
}

export async function getAIStatus(): Promise<AIStatus> {
  const response = await api.get<AIStatus>("/ai/status", { timeout: 10000 });
  return response.data;
}

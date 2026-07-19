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
  requestId?: string;
};

export type AIStatus = {
  success: boolean;
  provider: "gemini" | string;
  model: string;
  mode: "gemini" | "demo" | "unavailable";
  configured: boolean;
};

// Backend may perform one bounded retry after a transient Gemini failure.
const AI_TIMEOUT = 45000;

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

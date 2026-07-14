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
  source?: "gemini" | "demo" | string;
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

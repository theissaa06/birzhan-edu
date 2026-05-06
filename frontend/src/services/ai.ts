import axios from "axios";

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

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3003";

export async function sendAIMessage(
  message: string,
  history: AIMessage[] = [],
): Promise<AIResponse> {
  const response = await axios.post<AIResponse>(
    `${API_URL}/api/ai/chat`,
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

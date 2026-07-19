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
  conversation?: AIConversation | null;
};

export type AIOption = {
  id: string;
  label: string;
  description: string;
};

export type AIConversation = {
  id: string;
  title: string;
  mode: string;
  lastMessageAt: string;
  createdAt: string;
  updatedAt: string;
  preview?: string;
  messageCount?: number;
};

export type AIConversationMessage = AIMessage & {
  id: string;
  action?: string | null;
  createdAt?: string;
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
  options: { conversationId?: string | null; mode?: string; action?: string } = {},
): Promise<AIResponse> {
  const response = await api.post<AIResponse>(
    "/ai/chat",
    { message, history, ...options },
    {
      timeout: AI_TIMEOUT,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );

  return response.data;
}

export async function getAIOptions(): Promise<{ modes: AIOption[]; actions: AIOption[] }> {
  const response = await api.get<{ success: boolean; modes: AIOption[]; actions: AIOption[] }>("/ai/options");
  return { modes: response.data.modes || [], actions: response.data.actions || [] };
}

export async function getAIConversations(): Promise<AIConversation[]> {
  const response = await api.get<{ success: boolean; conversations: AIConversation[] }>("/ai/conversations");
  return response.data.conversations || [];
}

export async function getAIConversation(id: string): Promise<{ conversation: AIConversation; messages: AIConversationMessage[] }> {
  const response = await api.get<{ success: boolean; conversation: AIConversation; messages: AIConversationMessage[] }>(`/ai/conversations/${encodeURIComponent(id)}`);
  return { conversation: response.data.conversation, messages: response.data.messages || [] };
}

export async function deleteAIConversation(id: string): Promise<void> {
  await api.delete(`/ai/conversations/${encodeURIComponent(id)}`);
}

export async function getAIStatus(): Promise<AIStatus> {
  const response = await api.get<AIStatus>("/ai/status", { timeout: 10000 });
  return response.data;
}

import api from "./api";

export type SupportMessage = {
  id: number;
  text: string;
  from: "user" | "admin";
  userId?: number | null;
  parentId?: number | null;
  status?: string;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    email: string;
  } | null;
};

export async function getMySupportMessages() {
  const response = await api.get("/support/me");
  return response.data.data as SupportMessage[];
}

export async function sendSupportMessage(data: {
  text: string;
  name?: string;
  email?: string;
  topic?: string;
  clientRequestId: string;
}) {
  const response = await api.post("/support", data);
  return response.data.data as SupportMessage;
}

export async function deleteSupportMessage(id: number) {
  await api.delete(`/support/${id}`);
}

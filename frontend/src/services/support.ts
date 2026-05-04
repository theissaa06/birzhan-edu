import api from "./api";

export type SupportMessage = {
  id: number;
  text: string;
  from: "user" | "admin";
  userId?: number | null;
  createdAt: string;
  user?: {
    id: number;
    username: string;
    email: string;
  } | null;
};

export async function getSupportMessages() {
  const response = await api.get("/support");
  return response.data.data as SupportMessage[];
}

export async function sendSupportMessage(data: {
  text: string;
  from: "user" | "admin";
  userId?: number | null;
}) {
  const response = await api.post("/support", data);
  return response.data.data as SupportMessage;
}

export async function deleteSupportMessage(id: number) {
  await api.delete(`/support/${id}`);
}

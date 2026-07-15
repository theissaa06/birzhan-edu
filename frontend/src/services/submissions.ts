import api from "./api";

export type AssignmentSubmission = {
  id: number;
  lessonId: number;
  courseId?: number | null;
  type: "link" | "video";
  url: string;
  notes?: string | null;
  status: string;
  feedback?: string | null;
  isPublic: boolean;
  createdAt: string;
  lesson?: {
    id: number;
    title: string;
    course?: {
      id: number;
      title: string;
    };
  };
};

export async function createUploadUrl(payload: {
  lessonId: number;
  fileName: string;
  contentType: string;
  size: number;
}) {
  const response = await api.post("/submissions/upload-url", payload);
  return response.data.data;
}

export async function createSubmission(payload: {
  lessonId: number;
  type: "link" | "video";
  url: string;
  notes?: string;
  isPublic?: boolean;
}) {
  const response = await api.post("/submissions", payload);
  return response.data.data as AssignmentSubmission;
}

export async function getMySubmissions() {
  const response = await api.get("/submissions/me", { timeout: 12000 });
  return (response.data.data || []) as AssignmentSubmission[];
}

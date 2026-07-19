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
  attemptNumber?: number;
  createdAt: string;
  autoReview?: {
    id: number;
    status: "MANUAL_REQUIRED" | "QUEUED" | "PROCESSING" | "APPROVED" | "NEEDS_CHANGES" | "FAILED" | "APPEALED" | "MANUAL_APPROVED" | "MANUAL_NEEDS_CHANGES";
    result?: {
      score?: number;
      summary?: string;
      criteria?: Array<{ key: string; title: string; required: boolean; passed: boolean; confidence?: number; feedback: string; timecode?: string | null; source?: string }>;
    } | null;
    errorCode?: string | null;
    errorMessage?: string | null;
    createdAt?: string;
    completedAt?: string | null;
  } | null;
  appeal?: {
    id: number;
    reason: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
    resolution?: string | null;
    createdAt: string;
  } | null;
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
  technicalMetadata?: {
    uploadKey?: string;
    fileName?: string;
    contentType?: string;
    size?: number;
    durationSeconds?: number | null;
    width?: number | null;
    height?: number | null;
    hasAudio?: boolean | null;
  };
}) {
  const response = await api.post("/submissions", payload);
  return { submission: response.data.data as AssignmentSubmission, message: String(response.data.message || "Работа сохранена.") };
}

export async function getMySubmissions(lessonId?: number) {
  const response = await api.get("/submissions/me", { params: lessonId ? { lessonId } : undefined, timeout: 12000 });
  return (response.data.data || []) as AssignmentSubmission[];
}

export async function getSubmission(id: number) {
  const response = await api.get(`/submissions/${id}`, { timeout: 12000 });
  return response.data.data as AssignmentSubmission;
}

export async function retrySubmissionReview(id: number) {
  const response = await api.post(`/submissions/${id}/retry-analysis`);
  return String(response.data.message || "Проверка запущена повторно.");
}

export async function appealSubmissionReview(id: number, reason: string) {
  const response = await api.post(`/submissions/${id}/appeals`, { reason });
  return String(response.data.message || "Работа передана на ручной пересмотр.");
}

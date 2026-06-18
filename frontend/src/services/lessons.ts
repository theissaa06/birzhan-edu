import api from "./api";

export type LessonProgress = {
  id: number;
  userId: number;
  lessonId: number;
  courseId?: number | null;
  started?: boolean;
  completed: boolean;
  startedAt?: string | null;
  completedAt?: string | null;
};

export type LessonListItem = {
  id: number;
  title: string;
  content?: string | null;
  description?: string | null;
  videoUrl?: string | null;
  whatYouLearn?: string[] | null;
  steps?: string[] | null;
  taskText?: string | null;
  beginnerHelp?: string | null;
  hints?: string[] | null;
  orderNumber: number;
  type: "VIDEO" | "TEXT" | "PRACTICE" | "QUIZ";
  isPublished?: boolean;
  progress?: LessonProgress | null;
};

export type CourseProgress = {
  totalLessons: number;
  completedLessons: number;
  startedLessons: number;
  percentage: number;
  isCompleted: boolean;
};

function unwrap<T>(response: any): T {
  return response.data?.data ?? response.data;
}

export async function fetchLessonsByCourse(courseId: number) {
  const response = await api.get(`/courses/${courseId}/lessons`);
  return unwrap<LessonListItem[]>(response);
}

export async function fetchLesson(courseId: number, lessonId: number) {
  const response = await api.get(`/courses/${courseId}/lessons/${lessonId}`);
  return unwrap<LessonListItem>(response);
}

export async function startLesson(lessonId: number) {
  const response = await api.post(`/lessons/${lessonId}/start`);
  return unwrap<LessonProgress>(response);
}

export async function completeLesson(lessonId: number) {
  const response = await api.post(`/lessons/${lessonId}/complete`);
  return response.data;
}

export async function fetchCourseProgress(courseId: number) {
  const response = await api.get(`/courses/${courseId}/progress`);
  return unwrap<CourseProgress>(response);
}

export function getYoutubeEmbedUrl(url?: string | null) {
  if (!url) return null;
  if (url.includes("youtube.com/embed/")) return url;

  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;

  const watchMatch = url.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;

  const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;

  return null;
}

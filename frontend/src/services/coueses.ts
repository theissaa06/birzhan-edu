import api from "./api";

export const getCourses = (category?: string) =>
  api.get("/courses", { params: category ? { category } : {} });

export const getCourse = (id: number) => api.get(`/courses/${id}`);

export const createCourse = (data: object) => api.post("/courses", data);

export const updateCourse = (id: number, data: object) =>
  api.put(`/courses/${id}`, data);

export const deleteCourse = (id: number) => api.delete(`/courses/${id}`);

export const getLesson = (id: number) => api.get(`/lessons/${id}`);

export const completeLesson = (id: number) =>
  api.post(`/lessons/${id}/complete`);

import { useEffect, useState } from "react";
import api from "../services/api";

export type PublicStats = {
  students: number;
  courses: number;
  reviews: number;
  certificates: number;
  lessonsCompleted: number;
};

const EMPTY_STATS: PublicStats = {
  students: 0,
  courses: 0,
  reviews: 0,
  certificates: 0,
  lessonsCompleted: 0,
};

export default function usePublicStats() {
  const [stats, setStats] = useState<PublicStats>(EMPTY_STATS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api
      .get("/public/stats")
      .then(({ data }) => {
        if (active) setStats({ ...EMPTY_STATS, ...(data?.data || {}) });
      })
      .catch(() => {
        // Нули — честное состояние, если публичная статистика временно недоступна.
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return { stats, isLoading };
}

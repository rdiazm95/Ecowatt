import { apiClient } from './client';

export type HistoryDayPoint = {
  date: string;   // "2026-04-27"
  avg: number;
  min: number;
  max: number;
};

export async function fetchHistory(): Promise<HistoryDayPoint[]> {
  const res = await apiClient.get<HistoryDayPoint[]>('/dashboard/history');
  return res.data;
}
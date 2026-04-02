import { apiClient } from './client'; 

export type DashboardPricePoint = {
  hour: number;
  priceKwh: number;
  priceMwh: number;
};

export type TodayDashboard = {
  current: {
    datetime: string;
    priceKwh: number;
    priceMwh: number;
  } | null;
  today: {
    prices: DashboardPricePoint[];
    min: number;
    max: number;
    avg: number;
  };
  tomorrow: {
    hasPrices: boolean;
    message: string;
  };
};

export async function fetchTodayDashboard(): Promise<TodayDashboard> {
  
  const res = await apiClient.get<TodayDashboard>('/dashboard/today'); 
  return res.data;
}
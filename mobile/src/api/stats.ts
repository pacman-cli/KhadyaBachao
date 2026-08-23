import {api} from './client';
import type {UserRole} from './types';

export type MyStats = {
  role: UserRole;
  listingsPosted: number;
  pickupsCompleted: number;
  quantityRescued: number;
  claimsMade: number;
};

export type DailyRow = {
  date: string;
  rescued: number;
  listings: number;
  pickups: number;
};

export type SystemStats = {
  totalListings: number;
  completedPickups: number;
  totalRescued: number;
  daily: DailyRow[];
  leaderboard: {donorName: string; totalRescued: number}[];
};

export async function fetchMyStats(): Promise<MyStats> {
  const res = await api.get<MyStats>('/api/stats/me');
  return res.data;
}

export async function fetchSystemStats(): Promise<SystemStats> {
  const res = await api.get<SystemStats>('/api/stats/system');
  return res.data;
}

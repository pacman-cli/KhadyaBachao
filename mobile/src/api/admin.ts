import {api} from './client';
import type {Verification} from './verification';

export type ReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

export type AdminReport = {
  id: string;
  reporterId: string;
  reporterName: string;
  targetType: 'LISTING' | 'USER';
  targetId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
};

export type Metrics = {
  usersByRole: [string, number][];
  listingsByStatus: [string, number][];
  openReports: number;
  pendingVerifications: number;
};

export async function fetchReports(
  status: ReportStatus,
): Promise<AdminReport[]> {
  const res = await api.get('/api/admin/reports', {params: {status}});
  return res.data.content ?? [];
}

export async function resolveReport(id: string): Promise<void> {
  await api.patch(`/api/admin/reports/${id}/resolve`);
}

export async function dismissReport(id: string): Promise<void> {
  await api.patch(`/api/admin/reports/${id}/dismiss`);
}

export async function fetchVerifications(
  status: Verification['verificationStatus'],
): Promise<Verification[]> {
  const res = await api.get('/api/admin/verifications', {params: {status}});
  return res.data.content ?? [];
}

export async function approveVerification(id: string): Promise<void> {
  await api.patch(`/api/admin/verifications/${id}/approve`);
}

export async function rejectVerification(id: string): Promise<void> {
  await api.patch(`/api/admin/verifications/${id}/reject`);
}

export async function fetchMetrics(): Promise<Metrics> {
  const res = await api.get<Metrics>('/api/admin/metrics');
  return res.data;
}

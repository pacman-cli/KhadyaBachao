import {api} from './client';

export type ReportTargetType = 'LISTING' | 'USER';

export async function reportTarget(
  targetType: ReportTargetType,
  targetId: string,
  reason: string,
): Promise<void> {
  await api.post('/api/reports', {targetType, targetId, reason});
}

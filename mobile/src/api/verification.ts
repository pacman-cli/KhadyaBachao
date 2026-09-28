import {api} from './client';

export type VerificationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type Verification = {
  id: string;
  userId: string;
  userName: string;
  orgName: string;
  orgType: string | null;
  registrationDocUrl: string;
  verificationStatus: VerificationStatus;
};

export async function submitVerification(input: {
  orgName: string;
  orgType?: string;
  registrationDocUrl: string;
}): Promise<Verification> {
  const res = await api.post<Verification>('/api/verification/submit', input);
  return res.data;
}

export async function myVerification(): Promise<Verification | null> {
  try {
    const res = await api.get<Verification>('/api/verification/me');
    return res.data;
  } catch (e) {
    if ((e as {response?: {status?: number}})?.response?.status === 404) {
      return null;
    }
    throw e;
  }
}

import {api} from './client';

export type ChatMessage = {
  id: string;
  requestId: string;
  senderId: string;
  senderName: string;
  message: string;
  sentAt: string;
};

export type Schedule = {
  id: string;
  requestId: string;
  agreedTime: string;
  agreedLocation: string;
  confirmedByDonor: boolean;
  confirmedByRecipient: boolean;
  status: 'PROPOSED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
};

export async function fetchHistory(
  requestId: string,
  page = 0,
): Promise<ChatMessage[]> {
  const res = await api.get(`/api/requests/${requestId}/messages`, {
    params: {page},
  });
  // newest-first slice -> chronological order
  return [...(res.data.content ?? [])].reverse();
}

export async function sendMessageRest(
  requestId: string,
  message: string,
): Promise<ChatMessage> {
  const res = await api.post<ChatMessage>(
    `/api/requests/${requestId}/messages`,
    {message},
  );
  return res.data;
}

export async function getSchedule(requestId: string): Promise<Schedule | null> {
  try {
    const res = await api.get<Schedule>(`/api/requests/${requestId}/schedule`);
    return res.data;
  } catch (e) {
    if ((e as {response?: {status?: number}})?.response?.status === 404) {
      return null;
    }
    throw e;
  }
}

export async function proposeSchedule(
  requestId: string,
  agreedTime: string,
  agreedLocation: string,
): Promise<Schedule> {
  const res = await api.post<Schedule>(`/api/requests/${requestId}/schedule`, {
    agreedTime,
    agreedLocation,
  });
  return res.data;
}

export async function confirmSchedule(
  requestId: string,
): Promise<Schedule> {
  const res = await api.patch<Schedule>(
    `/api/requests/${requestId}/schedule/confirm`,
  );
  return res.data;
}

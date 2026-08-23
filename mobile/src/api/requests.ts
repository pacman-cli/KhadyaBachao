import {api} from './client';

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export type FoodRequest = {
  id: string;
  listingId: string;
  listingTitle: string;
  foodType: 'COOKED' | 'PACKAGED' | 'RAW';
  quantityValue: number;
  quantityUnit: string;
  listingStatus: string;
  recipientId: string;
  recipientName: string | null;
  recipientVerified: boolean;
  rated: boolean;
  status: RequestStatus;
  requestedAt: string;
};

export async function claimListing(listingId: string): Promise<FoodRequest> {
  const res = await api.post<FoodRequest>(`/api/listings/${listingId}/claim`);
  return res.data;
}

export async function myClaims(): Promise<FoodRequest[]> {
  const res = await api.get<FoodRequest[]>('/api/requests/mine');
  return res.data;
}

export async function cancelClaim(requestId: string): Promise<FoodRequest> {
  const res = await api.patch<FoodRequest>(`/api/requests/${requestId}/cancel`);
  return res.data;
}

export async function ratePickup(
  requestId: string,
  rating: number,
  comment?: string,
): Promise<void> {
  await api.post(`/api/requests/${requestId}/rate`, {rating, comment});
}

/** Donor: all claims on one of their listings (oldest first). */
export async function requestsForListing(listingId: string): Promise<FoodRequest[]> {
  const res = await api.get<FoodRequest[]>(`/api/listings/${listingId}/requests`);
  return res.data;
}

/** Donor confirms the handover; listing + request become COMPLETED. */
export async function completePickup(requestId: string): Promise<void> {
  await api.patch(`/api/requests/${requestId}/complete`);
}

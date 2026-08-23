import {api, API_BASE_URL} from './client';
import type {UserRole} from './types';

export type FoodType = 'COOKED' | 'PACKAGED' | 'RAW';

export type ListingStatus =
  | 'AVAILABLE'
  | 'CLAIMED'
  | 'EXPIRED'
  | 'COMPLETED'
  | 'CANCELLED';

export type Listing = {
  id: string;
  donorId: string;
  donorName: string | null;
  donorVerified: boolean;
  donorRole: UserRole | null;
  title: string;
  description: string | null;
  foodType: FoodType;
  quantityValue: number;
  quantityUnit: string;
  photoUrls: string[];
  preparedAt: string | null;
  pickupDeadline: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string | null;
  status: ListingStatus;
  createdAt: string;
};

export type CreateListingInput = {
  title: string;
  description?: string;
  foodType: FoodType;
  quantityValue: number;
  quantityUnit: string;
  photoUrls?: string[];
  preparedAt?: string;
  pickupDeadline: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
};

export async function createListing(input: CreateListingInput): Promise<Listing> {
  const res = await api.post<Listing>('/api/listings', input);
  return res.data;
}

export async function getListing(id: string): Promise<Listing> {
  const res = await api.get<Listing>(`/api/listings/${id}`);
  return res.data;
}

export async function updateListing(
  id: string,
  input: CreateListingInput,
): Promise<Listing> {
  const res = await api.put<Listing>(`/api/listings/${id}`, input);
  return res.data;
}

export async function deleteListing(id: string): Promise<void> {
  await api.delete(`/api/listings/${id}`);
}

export async function cancelListing(id: string): Promise<Listing> {
  const res = await api.patch<Listing>(`/api/listings/${id}/cancel`);
  return res.data;
}

export async function myListings(): Promise<Listing[]> {
  const res = await api.get<Listing[]>('/api/listings/mine');
  return res.data;
}

export async function nearbyListings(params: {
  lat: number;
  lng: number;
  radiusKm?: number;
  foodType?: FoodType;
  minQuantity?: number;
}): Promise<Listing[]> {
  const res = await api.get<Listing[]>('/api/listings/nearby', {params});
  return res.data;
}

/** Resolves relative backend URLs (e.g. /uploads/x.jpg) to absolute ones. */
export function absoluteUrl(url: string): string {
  return url.startsWith('/') ? `${API_BASE_URL}${url}` : url;
}

/** Uploads an image and returns its URL. */
export async function uploadImage(uri: string): Promise<string> {
  const form = new FormData();
  form.append('file', {
    uri,
    name: 'photo.jpg',
    type: 'image/jpeg',
  });
  const res = await api.post<{url: string}>('/api/uploads', form, {
    headers: {'Content-Type': 'multipart/form-data'},
  });
  return res.data.url;
}

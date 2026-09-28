import {api} from './client';
import type {UserRole, User} from './types';

export async function getMe(): Promise<User> {
  const res = await api.get<User>('/api/users/me');
  return res.data;
}

export async function updateProfile(input: {
  name?: string;
  phone?: string;
  profilePhotoUrl?: string;
}): Promise<User> {
  const res = await api.put<User>('/api/users/me', input);
  return res.data;
}

export async function updateRole(role: UserRole): Promise<User> {
  const res = await api.put<User>('/api/users/me/role', {role});
  return res.data;
}

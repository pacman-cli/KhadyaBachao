export type UserRole =
  | 'DONOR'
  | 'RECIPIENT_NGO'
  | 'RECIPIENT_INDIVIDUAL'
  | 'VOLUNTEER'
  | 'ADMIN';

export type User = {
  id: string;
  firebaseUid: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  role: UserRole;
  profilePhotoUrl: string | null;
  verified: boolean;
  ratingAvg: number;
  createdAt: string;
  updatedAt: string;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  DONOR: 'Donor',
  RECIPIENT_NGO: 'NGO / Charity',
  RECIPIENT_INDIVIDUAL: 'Individual',
  VOLUNTEER: 'Volunteer',
  ADMIN: 'Admin',
};

export const SELECTABLE_ROLES: UserRole[] = [
  'DONOR',
  'RECIPIENT_NGO',
  'RECIPIENT_INDIVIDUAL',
  'VOLUNTEER',
];

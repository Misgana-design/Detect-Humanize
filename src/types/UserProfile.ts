// @/types/index.ts or @/types/user.ts
export interface UserProfile {
  id: string;
  email?: string | null;
  fullName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  phone?: string | null;
  bio?: string | null;
  role?: "user" | "admin" | "moderator" | null;
  isActive?: boolean;
  createdAt: string; // ISO timestamp from Supabase
  updatedAt?: string | null; // ISO timestamp from Supabase
}

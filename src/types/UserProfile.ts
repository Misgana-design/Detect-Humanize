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
  credits?: number | null;
  api_usage_count?: number | null;
  words_used?: number | null;
  subscription_tier?:
    | "free"
    | "basic"
    | "pro"
    | "unlimited"
    | "enterprise"
    | "pro_weekly"
    | null;
  billing_cadence?: "free" | "monthly" | "yearly" | "weekly" | null;
  polar_customer_id?: string | null;
  polar_subscription_id?: string | null;
  createdAt: string; // ISO timestamp from Supabase
  updatedAt?: string | null; // ISO timestamp from Supabase
}
